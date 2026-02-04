import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Form, Step, Question, Theme, BuilderState, QuestionType, ConditionalNavigation, ProgressConfig, SubmissionConfig, PluginSettings } from '../types';
import { createForm, createStep, createQuestion, generateId } from '../utils/defaults';

// Action Types
type BuilderAction =
  | { type: 'SET_FORM'; payload: Form }
  | { type: 'UPDATE_FORM'; payload: Partial<Form> }
  | { type: 'ADD_STEP'; payload?: { afterStepId?: string } }
  | { type: 'UPDATE_STEP'; payload: { stepId: string; updates: Partial<Step> } }
  | { type: 'DELETE_STEP'; payload: { stepId: string } }
  | { type: 'REORDER_STEPS'; payload: { stepIds: string[] } }
  | { type: 'SELECT_STEP'; payload: { stepId: string | null } }
  | { type: 'ADD_QUESTION'; payload: { stepId: string; questionType: QuestionType; gridRow?: number } }
  | { type: 'UPDATE_QUESTION'; payload: { stepId: string; questionId: string; updates: Partial<Question> } }
  | { type: 'DELETE_QUESTION'; payload: { stepId: string; questionId: string } }
  | { type: 'REORDER_QUESTIONS'; payload: { stepId: string; questionIds: string[] } }
  | { type: 'SELECT_QUESTION'; payload: { questionId: string | null } }
  | { type: 'DUPLICATE_QUESTION'; payload: { stepId: string; questionId: string } }
  | { type: 'UPDATE_THEME'; payload: Partial<Theme> }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'UPDATE_PROGRESS_CONFIG'; payload: Partial<ProgressConfig> }
  | { type: 'UPDATE_SUBMISSION_CONFIG'; payload: Partial<SubmissionConfig> }
  | { type: 'UPDATE_PLUGIN_SETTINGS'; payload: Partial<PluginSettings> }
  | { type: 'ADD_CONDITIONAL_NAVIGATION'; payload: { stepId: string; navigation: ConditionalNavigation } }
  | { type: 'UPDATE_CONDITIONAL_NAVIGATION'; payload: { stepId: string; navigationId: string; updates: Partial<ConditionalNavigation> } }
  | { type: 'DELETE_CONDITIONAL_NAVIGATION'; payload: { stepId: string; navigationId: string } }
  | { type: 'TOGGLE_PREVIEW'; payload?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_FORM' }
  | { type: 'IMPORT_FORM'; payload: Form }
  | { type: 'MARK_SAVED' };

// Initial State
const initialState: BuilderState = {
  form: createForm(),
  selectedStepId: null,
  selectedQuestionId: null,
  previewMode: false,
  isDirty: false,
  history: [],
  historyIndex: -1,
};

// Helper to save state to history
const saveToHistory = (state: BuilderState): BuilderState => {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(JSON.parse(JSON.stringify(state.form)));
  
  // Limit history to 50 items
  if (newHistory.length > 50) {
    newHistory.shift();
  }
  
  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    isDirty: true,
  };
};

// Reducer
function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_FORM': {
      return saveToHistory({
        ...state,
        form: action.payload,
        selectedStepId: action.payload.steps[0]?.id || null,
        selectedQuestionId: null,
      });
    }

    case 'UPDATE_FORM': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          ...action.payload,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'ADD_STEP': {
      const newStep = createStep(state.form.steps.length);
      let newSteps: Step[];
      
      if (action.payload?.afterStepId) {
        const index = state.form.steps.findIndex(s => s.id === action.payload?.afterStepId);
        newSteps = [
          ...state.form.steps.slice(0, index + 1),
          newStep,
          ...state.form.steps.slice(index + 1),
        ];
      } else {
        newSteps = [...state.form.steps, newStep];
      }

      // Update navigation references
      const lastStep = newSteps[newSteps.length - 2];
      if (lastStep) {
        lastStep.defaultNextStep = newStep.id;
        newStep.defaultPrevStep = lastStep.id;
      }

      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: newSteps,
          updatedAt: new Date().toISOString(),
        },
        selectedStepId: newStep.id,
      });
    }

    case 'UPDATE_STEP': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: state.form.steps.map(step =>
            step.id === action.payload.stepId
              ? { ...step, ...action.payload.updates }
              : step
          ),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'DELETE_STEP': {
      const stepIndex = state.form.steps.findIndex(s => s.id === action.payload.stepId);
      const newSteps = state.form.steps.filter(s => s.id !== action.payload.stepId);
      
      // Update navigation references
      if (stepIndex > 0 && stepIndex < state.form.steps.length - 1) {
        const prevStep = newSteps[stepIndex - 1];
        const nextStep = newSteps[stepIndex];
        if (prevStep && nextStep) {
          prevStep.defaultNextStep = nextStep.id;
          nextStep.defaultPrevStep = prevStep.id;
        }
      }

      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: newSteps,
          updatedAt: new Date().toISOString(),
        },
        selectedStepId: newSteps[Math.min(stepIndex, newSteps.length - 1)]?.id || null,
        selectedQuestionId: null,
      });
    }

    case 'REORDER_STEPS': {
      const stepMap = new Map(state.form.steps.map(s => [s.id, s]));
      const newSteps = action.payload.stepIds
        .map(id => stepMap.get(id))
        .filter((s): s is Step => s !== undefined);

      // Update default navigation
      newSteps.forEach((step, index) => {
        step.defaultPrevStep = newSteps[index - 1]?.id;
        step.defaultNextStep = newSteps[index + 1]?.id;
        step.backButton.enabled = index > 0;
      });

      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: newSteps,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'SELECT_STEP': {
      return {
        ...state,
        selectedStepId: action.payload.stepId,
        selectedQuestionId: null,
      };
    }

    case 'ADD_QUESTION': {
      const { stepId, questionType, gridRow } = action.payload;
      const step = state.form.steps.find(s => s.id === stepId);
      if (!step) return state;

      const maxRow = step.questions.reduce((max, q) => Math.max(max, q.gridRow), 0);
      const newQuestion = createQuestion(questionType, gridRow ?? maxRow + 1);

      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: state.form.steps.map(s =>
            s.id === stepId
              ? { ...s, questions: [...s.questions, newQuestion] }
              : s
          ),
          updatedAt: new Date().toISOString(),
        },
        selectedQuestionId: newQuestion.id,
      });
    }

    case 'UPDATE_QUESTION': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: state.form.steps.map(step =>
            step.id === action.payload.stepId
              ? {
                  ...step,
                  questions: step.questions.map(q =>
                    q.id === action.payload.questionId
                      ? { ...q, ...action.payload.updates }
                      : q
                  ),
                }
              : step
          ),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'DELETE_QUESTION': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: state.form.steps.map(step =>
            step.id === action.payload.stepId
              ? {
                  ...step,
                  questions: step.questions.filter(q => q.id !== action.payload.questionId),
                }
              : step
          ),
          updatedAt: new Date().toISOString(),
        },
        selectedQuestionId: state.selectedQuestionId === action.payload.questionId ? null : state.selectedQuestionId,
      });
    }

    case 'REORDER_QUESTIONS': {
      const step = state.form.steps.find(s => s.id === action.payload.stepId);
      if (!step) return state;

      const questionMap = new Map(step.questions.map(q => [q.id, q]));
      const newQuestions = action.payload.questionIds
        .map(id => questionMap.get(id))
        .filter((q): q is Question => q !== undefined);

      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: state.form.steps.map(s =>
            s.id === action.payload.stepId
              ? { ...s, questions: newQuestions }
              : s
          ),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'SELECT_QUESTION': {
      return {
        ...state,
        selectedQuestionId: action.payload.questionId,
      };
    }

    case 'DUPLICATE_QUESTION': {
      const step = state.form.steps.find(s => s.id === action.payload.stepId);
      if (!step) return state;

      const question = step.questions.find(q => q.id === action.payload.questionId);
      if (!question) return state;

      const duplicatedQuestion: Question = {
        ...JSON.parse(JSON.stringify(question)),
        id: generateId(),
        label: `${question.label} (Copy)`,
        gridRow: question.gridRow + 1,
      };

      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: state.form.steps.map(s =>
            s.id === action.payload.stepId
              ? { ...s, questions: [...s.questions, duplicatedQuestion] }
              : s
          ),
          updatedAt: new Date().toISOString(),
        },
        selectedQuestionId: duplicatedQuestion.id,
      });
    }

    case 'UPDATE_THEME': {
      // Deep merge theme properties to ensure nested objects are properly updated
      const currentTheme = state.form.theme;
      const updates = action.payload;
      
      const newTheme = {
        ...currentTheme,
        ...updates,
        // Deep merge nested objects if they exist in updates
        colors: updates.colors ? { ...currentTheme.colors, ...updates.colors } : currentTheme.colors,
        typography: updates.typography ? { ...currentTheme.typography, ...updates.typography } : currentTheme.typography,
        spacing: updates.spacing ? { ...currentTheme.spacing, ...updates.spacing } : currentTheme.spacing,
        borders: updates.borders ? { ...currentTheme.borders, ...updates.borders } : currentTheme.borders,
        buttons: updates.buttons ? { ...currentTheme.buttons, ...updates.buttons } : currentTheme.buttons,
        inputs: updates.inputs ? { ...currentTheme.inputs, ...updates.inputs } : currentTheme.inputs,
        progressBar: updates.progressBar ? { ...currentTheme.progressBar, ...updates.progressBar } : currentTheme.progressBar,
      };
      
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          theme: newTheme,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'SET_THEME': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          theme: action.payload,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'UPDATE_PROGRESS_CONFIG': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          progressConfig: { ...state.form.progressConfig, ...action.payload },
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'UPDATE_SUBMISSION_CONFIG': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          submissionConfig: { ...state.form.submissionConfig, ...action.payload },
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'UPDATE_PLUGIN_SETTINGS': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          pluginSettings: { ...state.form.pluginSettings, ...action.payload },
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'ADD_CONDITIONAL_NAVIGATION': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: state.form.steps.map(step =>
            step.id === action.payload.stepId
              ? {
                  ...step,
                  conditionalNavigation: [...step.conditionalNavigation, action.payload.navigation],
                }
              : step
          ),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'UPDATE_CONDITIONAL_NAVIGATION': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: state.form.steps.map(step =>
            step.id === action.payload.stepId
              ? {
                  ...step,
                  conditionalNavigation: step.conditionalNavigation.map(nav =>
                    nav.id === action.payload.navigationId
                      ? { ...nav, ...action.payload.updates }
                      : nav
                  ),
                }
              : step
          ),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'DELETE_CONDITIONAL_NAVIGATION': {
      return saveToHistory({
        ...state,
        form: {
          ...state.form,
          steps: state.form.steps.map(step =>
            step.id === action.payload.stepId
              ? {
                  ...step,
                  conditionalNavigation: step.conditionalNavigation.filter(
                    nav => nav.id !== action.payload.navigationId
                  ),
                }
              : step
          ),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    case 'TOGGLE_PREVIEW': {
      return {
        ...state,
        previewMode: action.payload ?? !state.previewMode,
      };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        form: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        form: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        isDirty: true,
      };
    }

    case 'RESET_FORM': {
      const newForm = createForm();
      return {
        ...initialState,
        form: newForm,
        selectedStepId: newForm.steps[0]?.id || null,
        history: [newForm],
        historyIndex: 0,
      };
    }

    case 'IMPORT_FORM': {
      return saveToHistory({
        ...state,
        form: action.payload,
        selectedStepId: action.payload.steps[0]?.id || null,
        selectedQuestionId: null,
      });
    }

    case 'MARK_SAVED': {
      return {
        ...state,
        isDirty: false,
      };
    }

    default:
      return state;
  }
}

// Context
interface BuilderContextType {
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  // Helper methods
  getSelectedStep: () => Step | null;
  getSelectedQuestion: () => Question | null;
  getAllQuestions: () => Question[];
  loadForm: (config: any) => void;
}

const BuilderContext = createContext<BuilderContextType | null>(null);

// Provider
interface BuilderProviderProps {
  children: ReactNode;
}

export function BuilderProvider({ children }: BuilderProviderProps) {
  const [state, dispatch] = useReducer(builderReducer, {
    ...initialState,
    selectedStepId: initialState.form.steps[0]?.id || null,
    history: [initialState.form],
    historyIndex: 0,
  });

  const getSelectedStep = (): Step | null => {
    if (!state.selectedStepId) return null;
    return state.form.steps.find(s => s.id === state.selectedStepId) || null;
  };

  const getSelectedQuestion = (): Question | null => {
    if (!state.selectedQuestionId || !state.selectedStepId) return null;
    const step = state.form.steps.find(s => s.id === state.selectedStepId);
    if (!step) return null;
    return step.questions.find(q => q.id === state.selectedQuestionId) || null;
  };

  const getAllQuestions = (): Question[] => {
    return state.form.steps.flatMap(step => step.questions);
  };

  const loadForm = (config: any) => {
    // Convert FormConfig to Form if needed
    const form: Form = {
      id: config.id || generateId(),
      name: config.name || config.settings?.formTitle || 'Imported Form',
      version: config.version || '1.0.0',
      steps: config.steps || [],
      theme: config.theme || state.form.theme,
      progressConfig: config.progressConfig || state.form.progressConfig,
      submissionConfig: config.submissionConfig || state.form.submissionConfig,
      pluginSettings: config.pluginSettings || state.form.pluginSettings,
      createdAt: config.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'IMPORT_FORM', payload: form });
  };

  return (
    <BuilderContext.Provider value={{ state, dispatch, getSelectedStep, getSelectedQuestion, getAllQuestions, loadForm }}>
      {children}
    </BuilderContext.Provider>
  );
}

// Hook
export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
}

export type { BuilderAction };
