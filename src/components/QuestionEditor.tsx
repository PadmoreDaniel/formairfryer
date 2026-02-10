import React from 'react';
import { useBuilder } from '../context/BuilderContext';
import { Question, QuestionOption, QuestionType } from '../types';

export function QuestionEditor() {
  const { state, dispatch, getSelectedStep } = useBuilder();
  const step = getSelectedStep();
  
  // Find the selected question
  const selectedQuestion = step?.questions.find(q => q.id === state.selectedQuestionId);
  
  if (!step || !selectedQuestion) {
    return (
      <div className="question-editor">
        <div className="editor-header">
          <h3>Question Properties</h3>
        </div>
        <div className="editor-empty">
          <p>Select a question to edit its properties</p>
        </div>
      </div>
    );
  }

  const updateQuestion = (updates: Partial<Question>) => {
    dispatch({
      type: 'UPDATE_QUESTION',
      payload: { stepId: step.id, questionId: selectedQuestion.id, updates },
    });
  };

  const updateValidation = (updates: Partial<Question['validation']>) => {
    updateQuestion({
      validation: { ...selectedQuestion.validation, ...updates },
    });
  };

  const handleAddOption = () => {
    const options = selectedQuestion.options || [];
    const newOption: QuestionOption = {
      id: `id_${Math.random().toString(36).substring(2, 11)}`,
      label: `Option ${options.length + 1}`,
      value: `option${options.length + 1}`,
    };
    updateQuestion({ options: [...options, newOption] });
  };

  const handleUpdateOption = (optionId: string, updates: Partial<QuestionOption>) => {
    const options = selectedQuestion.options || [];
    updateQuestion({
      options: options.map(opt =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      ),
    });
  };

  const handleRemoveOption = (optionId: string) => {
    const options = selectedQuestion.options || [];
    updateQuestion({ options: options.filter(opt => opt.id !== optionId) });
  };

  const hasOptions = ['radio', 'checkbox', 'select', 'multiselect'].includes(selectedQuestion.type);
  const hasMinMax = ['number', 'slider'].includes(selectedQuestion.type);
  const hasTextLength = ['text', 'textarea', 'email', 'phone'].includes(selectedQuestion.type);

  const questionTypeLabels: Record<QuestionType, string> = {
    text: 'Text Input',
    textarea: 'Text Area',
    email: 'Email',
    phone: 'Phone',
    number: 'Number',
    currency: 'Currency',
    radio: 'Single Choice',
    checkbox: 'Multiple Choice',
    select: 'Dropdown',
    multiselect: 'Multi-Select',
    date: 'Date',
    time: 'Time',
    datetime: 'Date & Time',
    file: 'File Upload',
    rating: 'Rating',
    slider: 'Slider',
    hidden: 'Hidden Field',
    eircode: 'Eircode',
    numberplate: 'Number Plate',
    privacy_policy: 'Privacy Policy',
  };

  return (
    <div className="question-editor">
      <div className="editor-header">
        <h3>Question Properties</h3>
        <span className="question-type-badge">{questionTypeLabels[selectedQuestion.type]}</span>
      </div>

      <div className="editor-section">
        <div className="form-group">
          <label>Label</label>
          <input
            type="text"
            value={selectedQuestion.label}
            onChange={(e) => updateQuestion({ label: e.target.value })}
            placeholder="Enter question label..."
          />
        </div>

        <div className="form-group checkbox-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={selectedQuestion.hideLabel || false}
              onChange={(e) => updateQuestion({ hideLabel: e.target.checked })}
            />
            <span className="toggle-text">Hide label (label still required for accessibility)</span>
          </label>
        </div>

        <div className="form-group">
          <label>Field Name (for form submission)</label>
          <input
            type="text"
            value={selectedQuestion.fieldName || ''}
            onChange={(e) => updateQuestion({ fieldName: e.target.value })}
            placeholder={selectedQuestion.id}
          />
          <span className="form-hint">Used as the field name when submitting the form</span>
        </div>

        {selectedQuestion.type !== 'hidden' && (
          <div className="form-group">
            <label>Placeholder</label>
            <input
              type="text"
              value={selectedQuestion.placeholder || ''}
              onChange={(e) => updateQuestion({ placeholder: e.target.value })}
              placeholder="Enter placeholder text..."
            />
          </div>
        )}

        <div className="form-group">
          <label>Help Text</label>
          <input
            type="text"
            value={selectedQuestion.helpText || ''}
            onChange={(e) => updateQuestion({ helpText: e.target.value })}
            placeholder="Additional instructions for the user..."
          />
        </div>

        {['date', 'datetime'].includes(selectedQuestion.type) && (
          <div className="form-group checkbox-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={selectedQuestion.useDateInputMask || false}
                onChange={(e) => updateQuestion({ useDateInputMask: e.target.checked })}
              />
              <span className="toggle-text">Use text input with mask (better for mobile)</span>
            </label>
            <span className="form-hint" style={{ display: 'block', marginTop: '4px' }}>
              Replaces date picker with a text field using input mask (e.g., DD/MM/YYYY)
            </span>
          </div>
        )}

        {selectedQuestion.type === 'hidden' && (
          <div className="form-group">
            <label>Default Value</label>
            <input
              type="text"
              value={selectedQuestion.defaultValue || ''}
              onChange={(e) => updateQuestion({ defaultValue: e.target.value })}
              placeholder="Value for hidden field..."
            />
          </div>
        )}

        {selectedQuestion.type === 'privacy_policy' && (
          <>
            <div className="form-group">
              <label>Checkbox Text</label>
              <input
                type="text"
                value={selectedQuestion.privacyPolicyText || ''}
                onChange={(e) => updateQuestion({ privacyPolicyText: e.target.value })}
                placeholder="I agree to the"
              />
              <span className="form-hint">Text displayed before the Privacy Policy link</span>
            </div>
            <div className="form-group">
              <label>Privacy Policy URL</label>
              <input
                type="url"
                value={selectedQuestion.privacyPolicyUrl || ''}
                onChange={(e) => updateQuestion({ privacyPolicyUrl: e.target.value })}
                placeholder="https://example.com/privacy-policy"
              />
              <span className="form-hint">Link to your privacy policy page</span>
            </div>
          </>
        )}
      </div>

      {/* Options for radio/checkbox/select */}
      {hasOptions && (
        <div className="editor-section">
          <div className="section-header">
            <h4>Options</h4>
            <button type="button" className="btn-small" onClick={handleAddOption}>
              + Add Option
            </button>
          </div>
          
          <div className="options-list">
            {(selectedQuestion.options || []).map((option, index) => (
              <div key={option.id} className="option-item">
                <span className="option-number">{index + 1}</span>
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) => handleUpdateOption(option.id, { label: e.target.value })}
                  placeholder="Label"
                  className="option-label-input"
                />
                <input
                  type="text"
                  value={option.value}
                  onChange={(e) => handleUpdateOption(option.id, { value: e.target.value })}
                  placeholder="Value"
                  className="option-value-input"
                />
                <button
                  type="button"
                  className="btn-icon btn-danger"
                  onClick={() => handleRemoveOption(option.id)}
                  title="Remove option"
                >
                  ×
                </button>
              </div>
            ))}
            {(!selectedQuestion.options || selectedQuestion.options.length === 0) && (
              <p className="no-options">No options yet. Add some options above.</p>
            )}
          </div>
        </div>
      )}

      {/* Validation */}
      <div className="editor-section">
        <h4>Validation</h4>
        
        <div className="form-group checkbox-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={selectedQuestion.validation.required}
              onChange={(e) => updateValidation({ required: e.target.checked })}
            />
            <span className="toggle-text">Required field</span>
          </label>
        </div>

        {hasTextLength && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Min Length</label>
                <input
                  type="number"
                  value={selectedQuestion.validation.minLength || ''}
                  onChange={(e) => updateValidation({ minLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="form-group">
                <label>Max Length</label>
                <input
                  type="number"
                  value={selectedQuestion.validation.maxLength || ''}
                  onChange={(e) => updateValidation({ maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="∞"
                  min={0}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Pattern (Regex)</label>
              <input
                type="text"
                value={selectedQuestion.validation.pattern || ''}
                onChange={(e) => updateValidation({ pattern: e.target.value })}
                placeholder="e.g., ^[A-Z0-9]+$"
              />
            </div>

            {selectedQuestion.validation.pattern && (
              <div className="form-group">
                <label>Pattern Error Message</label>
                <input
                  type="text"
                  value={selectedQuestion.validation.patternMessage || ''}
                  onChange={(e) => updateValidation({ patternMessage: e.target.value })}
                  placeholder="Please enter a valid format"
                />
              </div>
            )}
          </>
        )}

        {hasMinMax && (
          <div className="form-row">
            <div className="form-group">
              <label>Min Value</label>
              <input
                type="number"
                value={selectedQuestion.validation.min ?? ''}
                onChange={(e) => updateValidation({ min: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
            <div className="form-group">
              <label>Max Value</label>
              <input
                type="number"
                value={selectedQuestion.validation.max ?? ''}
                onChange={(e) => updateValidation({ max: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid Layout */}
      <div className="editor-section">
        <h4>Layout</h4>
        
        <div className="form-row">
          <div className="form-group">
            <label>Column Start</label>
            <input
              type="number"
              value={selectedQuestion.gridColumn}
              onChange={(e) => updateQuestion({ gridColumn: parseInt(e.target.value) || 1 })}
              min={1}
              max={12}
            />
          </div>
          <div className="form-group">
            <label>Column Span</label>
            <input
              type="number"
              value={selectedQuestion.gridColumnSpan}
              onChange={(e) => updateQuestion({ gridColumnSpan: parseInt(e.target.value) || 1 })}
              min={1}
              max={12}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Row</label>
          <input
            type="number"
            value={selectedQuestion.gridRow}
            onChange={(e) => updateQuestion({ gridRow: parseInt(e.target.value) || 1 })}
            min={1}
          />
        </div>
      </div>

      {/* Delete Question */}
      <div className="editor-section">
        <button
          type="button"
          className="btn btn-danger btn-full"
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this question?')) {
              dispatch({ type: 'DELETE_QUESTION', payload: { stepId: step.id, questionId: selectedQuestion.id } });
            }
          }}
        >
          Delete Question
        </button>
      </div>
    </div>
  );
}
