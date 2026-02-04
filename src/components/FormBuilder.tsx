import React, { useState, useCallback, useEffect } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { useAuth } from '../context/AuthContext';
import { saveForm, updateForm } from '../services/formService';
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
}

export function FormBuilder({ onShowFormsList }: FormBuilderProps) {
  const { state, dispatch, getSelectedStep } = useBuilder();
  const { user } = useAuth();
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('question');
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
  }, [state.form, dispatch, user, currentFormId]);

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

  // Load from localStorage on mount
  useEffect(() => {
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

      <div className="builder-main">
        {/* Left Sidebar - Steps */}
        <aside className="sidebar sidebar-left">
          <StepsSidebar onAddStep={handleAddStep} />
          <QuestionPalette onAddQuestion={handleAddQuestion} />
        </aside>

        {/* Center - Step Editor */}
        <main className="builder-canvas">
          <StepEditor />
        </main>

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
