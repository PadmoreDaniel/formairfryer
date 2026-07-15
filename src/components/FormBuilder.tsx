import React, { useState, useCallback, useEffect } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { useAuth } from '../context/AuthContext';
import { saveForm, updateForm, saveProject, updateProject } from '../services/formService';
import { Header } from './Header';
import { StepsSidebar } from './StepsSidebar';
import { QuestionPalette } from './QuestionPalette';
import { StepEditor } from './StepEditor';
import { QuestionEditor } from './QuestionEditor';
import { FormPreview } from './FormPreview';
import { ThemeEditor } from './ThemeEditor';
import { ProgressBarEditor } from './ProgressBarEditor';
import { FormSettings } from './FormSettings';
import { ExportPanel } from './ExportPanel';
import { ConditionalNavigationEditor } from './ConditionalNavigationEditor';
import { StepFlowVisualization } from './StepFlowVisualization';
import { QuestionType } from '../types';

type RightPanelTab = 'question' | 'theme' | 'progress' | 'navigation' | 'flow' | 'settings' | 'export';

interface FormBuilderProps {
  onShowFormsList?: () => void;
  loadedFormId?: string | null;
}

// Resizable sidebar bounds (px).
const LEFT_MIN = 200;
const LEFT_MAX = 480;
const LEFT_DEFAULT = 260;
const RIGHT_MIN = 320;
const RIGHT_MAX = 760;
const RIGHT_DEFAULT = 480;
const LEFT_WIDTH_KEY = 'wp-form-builder-left-width';
const RIGHT_WIDTH_KEY = 'wp-form-builder-right-width';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const readStoredWidth = (key: string, fallback: number, min: number, max: number): number => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) return clamp(parsed, min, max);
    }
  } catch {
    /* ignore storage errors */
  }
  return fallback;
};

interface ResizeHandleProps {
  ariaLabel: string;
  min: number;
  max: number;
  value: number;
  onResize: (next: number) => void;
  // Direction the pointer delta maps to width growth: 'right' means moving
  // the pointer right grows the panel (left sidebar), 'left' means moving the
  // pointer left grows the panel (right sidebar).
  grow: 'right' | 'left';
}

// Draggable, keyboard-accessible splitter between builder panels.
function ResizeHandle({ ariaLabel, min, max, value, onResize, grow }: ResizeHandleProps) {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startValue = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = grow === 'right' ? startValue + delta : startValue - delta;
      onResize(clamp(next, min, max));
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const smallStep = 8;
    const largeStep = 24;
    const step = e.shiftKey ? largeStep : smallStep;
    // Growth direction depends on which side the panel is on.
    const growKey = grow === 'right' ? 'ArrowRight' : 'ArrowLeft';
    const shrinkKey = grow === 'right' ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === growKey) {
      e.preventDefault();
      onResize(clamp(value + step, min, max));
    } else if (e.key === shrinkKey) {
      e.preventDefault();
      onResize(clamp(value - step, min, max));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onResize(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onResize(max);
    }
  };

  return (
    <div
      className="resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    />
  );
}

export function FormBuilder({ onShowFormsList, loadedFormId }: FormBuilderProps) {
  const { state, dispatch, getSelectedStep } = useBuilder();
  const { user } = useAuth();
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('question');
  const [currentFormId, setCurrentFormId] = useState<string | null>(loadedFormId || null);
  const [saving, setSaving] = useState(false);
  const [leftWidth, setLeftWidth] = useState<number>(() =>
    readStoredWidth(LEFT_WIDTH_KEY, LEFT_DEFAULT, LEFT_MIN, LEFT_MAX));
  const [rightWidth, setRightWidth] = useState<number>(() =>
    readStoredWidth(RIGHT_WIDTH_KEY, RIGHT_DEFAULT, RIGHT_MIN, RIGHT_MAX));

  const handleLeftResize = useCallback((next: number) => {
    setLeftWidth(next);
    try { localStorage.setItem(LEFT_WIDTH_KEY, String(Math.round(next))); } catch { /* ignore */ }
  }, []);

  const handleRightResize = useCallback((next: number) => {
    setRightWidth(next);
    try { localStorage.setItem(RIGHT_WIDTH_KEY, String(Math.round(next))); } catch { /* ignore */ }
  }, []);

  // Update currentFormId when a form is loaded from the list
  useEffect(() => {
    if (loadedFormId !== undefined && loadedFormId !== null) {
      setCurrentFormId(loadedFormId);
    }
  }, [loadedFormId]);

  const handleSave = useCallback(async () => {
    // Always save to localStorage
    localStorage.setItem('wp-form-builder-form', JSON.stringify(state.form));
    
    // If user is logged in, also save to Firebase
    if (user) {
      setSaving(true);
      try {
        if (currentFormId) {
          await updateForm(currentFormId, state.form);
        } else {
          const newFormId = await saveForm(user.uid, state.form);
          setCurrentFormId(newFormId);
        }
        // Persist the owning project (defaults + form membership) when present.
        if (state.currentProject) {
          const project = state.currentProject;
          const formIds = project.formIds.includes(state.form.id)
            ? project.formIds
            : [...project.formIds, state.form.id];
          const projectToSave = { ...project, formIds, updatedAt: new Date().toISOString() };
          const existing = await import('../services/formService').then((m) => m.getProject(project.id));
          if (existing) {
            await updateProject(projectToSave);
          } else {
            await saveProject(user.uid, projectToSave);
          }
          dispatch({ type: 'SET_PROJECT', payload: projectToSave });
        }
        dispatch({ type: 'MARK_SAVED' });
        alert('Form saved to cloud!');
      } catch (error: any) {
        console.error('Failed to save to Firebase:', error);
        alert('Form saved locally. Cloud save failed: ' + error.message);
      } finally {
        setSaving(false);
      }
    } else {
      dispatch({ type: 'MARK_SAVED' });
      alert('Form saved to browser storage!');
    }
  }, [state.form, state.currentProject, dispatch, user, currentFormId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            dispatch({ type: 'UNDO' });
            break;
          case 'y':
            e.preventDefault();
            dispatch({ type: 'REDO' });
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, handleSave]);

  const handleAddStep = useCallback(() => {
    dispatch({ type: 'ADD_STEP', payload: {} });
  }, [dispatch]);

  const handleAddQuestion = useCallback((type: QuestionType) => {
    const selectedStep = getSelectedStep();
    if (selectedStep) {
      dispatch({
        type: 'ADD_QUESTION',
        payload: { stepId: selectedStep.id, questionType: type },
      });
      setRightPanelTab('question');
    }
  }, [dispatch, getSelectedStep]);

  const handlePreview = useCallback(() => {
    dispatch({ type: 'TOGGLE_PREVIEW', payload: true });
  }, [dispatch]);

  // Load from localStorage on mount (only if no form was loaded from the list)
  useEffect(() => {
    if (loadedFormId) return; // Skip - a form was explicitly loaded
    const savedForm = localStorage.getItem('wp-form-builder-form');
    if (savedForm) {
      try {
        const form = JSON.parse(savedForm);
        dispatch({ type: 'SET_FORM', payload: form });
      } catch (e) {
        console.error('Failed to load saved form:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="form-builder">
      <Header 
        onPreview={handlePreview} 
        onSave={handleSave} 
        onShowFormsList={onShowFormsList}
        saving={saving}
      />

      <div
        className="builder-main"
        style={{
          ['--left-sidebar-width' as any]: `${leftWidth}px`,
          ['--right-sidebar-width' as any]: `${rightWidth}px`,
        }}
      >
        {/* Left Sidebar - Steps */}
        <aside className="sidebar sidebar-left">
          <StepsSidebar onAddStep={handleAddStep} />
          <QuestionPalette onAddQuestion={handleAddQuestion} />
        </aside>

        <ResizeHandle
          ariaLabel="Resize left sidebar"
          min={LEFT_MIN}
          max={LEFT_MAX}
          value={leftWidth}
          onResize={handleLeftResize}
          grow="right"
        />

        {/* Center - Step Editor */}
        <main className="builder-canvas">
          <StepEditor />
        </main>

        <ResizeHandle
          ariaLabel="Resize right sidebar"
          min={RIGHT_MIN}
          max={RIGHT_MAX}
          value={rightWidth}
          onResize={handleRightResize}
          grow="left"
        />

        {/* Right Sidebar - Properties */}
        <aside className="sidebar sidebar-right">
          <div className="right-panel-tabs">
            <button
              className={`tab-btn ${rightPanelTab === 'question' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('question')}
              title="Question Properties"
            >
              Q
            </button>
            <button
              className={`tab-btn ${rightPanelTab === 'flow' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('flow')}
              title="Step Flow"
            >
              ⟳
            </button>
            <button
              className={`tab-btn ${rightPanelTab === 'navigation' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('navigation')}
              title="Conditional Navigation"
            >
              ↗
            </button>
            <button
              className={`tab-btn ${rightPanelTab === 'progress' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('progress')}
              title="Progress Bar"
            >
              ▬
            </button>
            <button
              className={`tab-btn ${rightPanelTab === 'theme' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('theme')}
              title="Theme"
            >
              ◐
            </button>
            <button
              className={`tab-btn ${rightPanelTab === 'settings' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('settings')}
              title="Form Settings"
            >
              ⚙
            </button>
            <button
              className={`tab-btn ${rightPanelTab === 'export' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('export')}
              title="Export"
            >
              ↓
            </button>
          </div>

          <div className="right-panel-content">
            {rightPanelTab === 'question' && <QuestionEditor />}
            {rightPanelTab === 'flow' && <StepFlowVisualization />}
            {rightPanelTab === 'navigation' && <ConditionalNavigationEditor />}
            {rightPanelTab === 'progress' && <ProgressBarEditor />}
            {rightPanelTab === 'theme' && <ThemeEditor />}
            {rightPanelTab === 'settings' && <FormSettings />}
            {rightPanelTab === 'export' && <ExportPanel />}
          </div>
        </aside>
      </div>

      {/* Preview Modal */}
      <FormPreview />
    </div>
  );
}
