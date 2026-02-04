import React from 'react';
import { useBuilder } from '../context/BuilderContext';

interface StepsSidebarProps {
  onAddStep: () => void;
}

export function StepsSidebar({ onAddStep }: StepsSidebarProps) {
  const { state, dispatch } = useBuilder();
  const { form, selectedStepId } = state;

  const handleSelectStep = (stepId: string) => {
    dispatch({ type: 'SELECT_STEP', payload: { stepId } });
  };

  const handleDeleteStep = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    if (form.steps.length <= 1) {
      alert('Cannot delete the only step');
      return;
    }
    if (window.confirm('Are you sure you want to delete this step?')) {
      dispatch({ type: 'DELETE_STEP', payload: { stepId } });
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIndex === targetIndex) return;

    const newStepIds = [...form.steps.map(s => s.id)];
    const [removed] = newStepIds.splice(sourceIndex, 1);
    newStepIds.splice(targetIndex, 0, removed);

    dispatch({ type: 'REORDER_STEPS', payload: { stepIds: newStepIds } });
  };

  return (
    <div className="steps-sidebar">
      <div className="sidebar-header">
        <h3>Steps</h3>
        <button className="btn-add-step" onClick={onAddStep} title="Add Step">
          <span>+</span>
        </button>
      </div>
      
      <div className="steps-list">
        {form.steps.map((step, index) => (
          <div
            key={step.id}
            className={`step-item ${selectedStepId === step.id ? 'selected' : ''}`}
            onClick={() => handleSelectStep(step.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="step-item-content">
              <span className="step-number">{index + 1}</span>
              <div className="step-info">
                <span className="step-title">{step.title}</span>
                <span className="step-question-count">
                  {step.questions.length} question{step.questions.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="step-actions">
              <button
                className="btn-icon btn-delete"
                onClick={(e) => handleDeleteStep(e, step.id)}
                title="Delete Step"
                disabled={form.steps.length <= 1}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="steps-summary">
        <div className="summary-item">
          <span className="summary-label">Total Steps</span>
          <span className="summary-value">{form.steps.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Questions</span>
          <span className="summary-value">
            {form.steps.reduce((sum, step) => sum + step.questions.length, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
