import React, { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { Question, QuestionType, BackgroundSize, BackgroundPosition } from '../types';
import { questionTypeInfo } from '../utils/defaults';

export function StepEditor() {
  const { state, dispatch, getSelectedStep } = useBuilder();
  const step = getSelectedStep();
  const [editingTitle, setEditingTitle] = useState(false);

  if (!step) {
    return (
      <div className="step-editor empty-state">
        <div className="empty-state-content">
          <span className="empty-icon">📋</span>
          <h3>No Step Selected</h3>
          <p>Select a step from the sidebar or create a new one to get started.</p>
        </div>
      </div>
    );
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_STEP',
      payload: { stepId: step.id, updates: { title: e.target.value } },
    });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({
      type: 'UPDATE_STEP',
      payload: { stepId: step.id, updates: { description: e.target.value } },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, gridRow?: number) => {
    e.preventDefault();
    const questionType = e.dataTransfer.getData('questionType') as QuestionType;
    if (questionType) {
      dispatch({
        type: 'ADD_QUESTION',
        payload: { stepId: step.id, questionType, gridRow },
      });
    }
  };

  const handleSelectQuestion = (questionId: string | null) => {
    dispatch({ type: 'SELECT_QUESTION', payload: { questionId } });
  };

  const handleDeleteQuestion = (questionId: string) => {
    dispatch({
      type: 'DELETE_QUESTION',
      payload: { stepId: step.id, questionId },
    });
  };

  const handleDuplicateQuestion = (questionId: string) => {
    dispatch({
      type: 'DUPLICATE_QUESTION',
      payload: { stepId: step.id, questionId },
    });
  };

  const handleQuestionDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('questionIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuestionDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('questionIndex'));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const newQuestionIds = [...step.questions.map(q => q.id)];
    const [removed] = newQuestionIds.splice(sourceIndex, 1);
    newQuestionIds.splice(targetIndex, 0, removed);

    dispatch({
      type: 'REORDER_QUESTIONS',
      payload: { stepId: step.id, questionIds: newQuestionIds },
    });
  };

  return (
    <div className="step-editor">
      <div className="step-header">
        <div className="step-title-section">
          {editingTitle ? (
            <input
              type="text"
              value={step.title}
              onChange={handleTitleChange}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
              className="step-title-input"
              autoFocus
            />
          ) : (
            <h2
              className="step-title"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {step.title}
              <span className="edit-icon">✏️</span>
            </h2>
          )}
        </div>
        
        <textarea
          value={step.description || ''}
          onChange={handleDescriptionChange}
          placeholder="Add a description for this step (optional)"
          className="step-description-input"
          rows={2}
        />
      </div>

      <div
        className="questions-grid"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e)}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${step.gridColumns}, 1fr)`,
          gap: `${step.gridGap}px`,
        }}
      >
        {step.questions.length === 0 ? (
          <div className="questions-empty-state">
            <div className="drop-zone">
              <span className="drop-icon">📥</span>
              <p>Drag and drop questions here</p>
              <p className="drop-hint">or click a question type from the palette</p>
            </div>
          </div>
        ) : (
          step.questions.map((question, index) => (
            <div
              key={question.id}
              className={`question-card ${state.selectedQuestionId === question.id ? 'selected' : ''}`}
              style={{
                gridColumn: `${question.gridColumn} / span ${question.gridColumnSpan}`,
                gridRow: question.gridRow,
              }}
              onClick={() => handleSelectQuestion(question.id)}
              draggable
              onDragStart={(e) => handleQuestionDragStart(e, index)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.stopPropagation(); handleQuestionDrop(e, index); }}
            >
              <div className="question-card-header">
                <span className="question-type-badge">
                  {questionTypeInfo[question.type]?.icon} {questionTypeInfo[question.type]?.label}
                </span>
                <div className="question-card-actions">
                  <button
                    className="btn-icon"
                    onClick={(e) => { e.stopPropagation(); handleDuplicateQuestion(question.id); }}
                    title="Duplicate"
                  >
                    📋
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(question.id); }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="question-card-content">
                <span className="question-label">{question.label}</span>
                {question.validation.required && (
                  <span className="required-badge">Required</span>
                )}
              </div>
              <div className="question-preview">
                <QuestionPreview question={question} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="step-layout-config" style={{ marginBottom: '12px', padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>📐 Content Alignment</h4>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Aligns title, description &amp; buttons (not questions)</p>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              style={{
                flex: 1,
                padding: '6px 8px',
                border: `1.5px solid ${(step.contentAlignment || 'left') === align ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-sm)',
                background: (step.contentAlignment || 'left') === align ? 'rgba(4, 128, 128, 0.1)' : 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: (step.contentAlignment || 'left') === align ? 600 : 400,
                color: (step.contentAlignment || 'left') === align ? 'var(--color-primary)' : 'var(--color-text-muted)',
                textTransform: 'capitalize' as const,
              }}
              onClick={() =>
                dispatch({
                  type: 'UPDATE_STEP',
                  payload: { stepId: step.id, updates: { contentAlignment: align } },
                })
              }
            >
              {align === 'left' ? '◧' : align === 'center' ? '◫' : '◨'} {align}
            </button>
          ))}
        </div>
      </div>

      {/* Min Height */}
      <div className="step-layout-config" style={{ marginBottom: '12px', padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>📏 Min Height</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            value={step.minHeight || ''}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_STEP',
                payload: {
                  stepId: step.id,
                  updates: { minHeight: e.target.value ? parseInt(e.target.value) : undefined },
                },
              })
            }
            placeholder="Auto"
            min="0"
            step="10"
            style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', background: 'var(--color-surface)' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>px</span>
          {step.minHeight && (
            <button
              onClick={() =>
                dispatch({
                  type: 'UPDATE_STEP',
                  payload: { stepId: step.id, updates: { minHeight: undefined } },
                })
              }
              style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--color-error, #e53e3e)' }}
              title="Reset to auto"
            >
              ✕
            </button>
          )}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Set a minimum height for this step (leave empty for auto)</p>
      </div>

      {/* Background Image */}
      <div className="step-layout-config" style={{ marginBottom: '12px', padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>🖼️ Background Image</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Image URL</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                type="text"
                value={step.backgroundImage?.url || ''}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_STEP',
                    payload: {
                      stepId: step.id,
                      updates: {
                        backgroundImage: {
                          url: e.target.value,
                          size: step.backgroundImage?.size || 'cover',
                          position: step.backgroundImage?.position || 'center',
                          opacity: step.backgroundImage?.opacity ?? 1,
                          overlay: step.backgroundImage?.overlay || '',
                        },
                      },
                    },
                  })
                }
                placeholder="https://example.com/image.jpg"
                style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', background: 'var(--color-surface)' }}
              />
              {step.backgroundImage?.url && (
                <button
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_STEP',
                      payload: { stepId: step.id, updates: { backgroundImage: undefined } },
                    })
                  }
                  style={{ padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--color-error, #e53e3e)' }}
                  title="Remove background image"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {step.backgroundImage?.url && (
            <>
              {/* Preview thumbnail */}
              <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)', height: '80px', backgroundImage: `url(${step.backgroundImage.url})`, backgroundSize: step.backgroundImage.size || 'cover', backgroundPosition: (step.backgroundImage.position || 'center').replace('-', ' '), opacity: step.backgroundImage.opacity ?? 1 }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Size</label>
                  <select
                    value={step.backgroundImage.size || 'cover'}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_STEP',
                        payload: {
                          stepId: step.id,
                          updates: {
                            backgroundImage: { ...step.backgroundImage!, size: e.target.value as BackgroundSize },
                          },
                        },
                      })
                    }
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', background: 'var(--color-surface)' }}
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Position</label>
                  <select
                    value={step.backgroundImage.position || 'center'}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_STEP',
                        payload: {
                          stepId: step.id,
                          updates: {
                            backgroundImage: { ...step.backgroundImage!, position: e.target.value as BackgroundPosition },
                          },
                        },
                      })
                    }
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', background: 'var(--color-surface)' }}
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Opacity</span>
                  <span>{Math.round((step.backgroundImage.opacity ?? 1) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={step.backgroundImage.opacity ?? 1}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_STEP',
                      payload: {
                        stepId: step.id,
                        updates: {
                          backgroundImage: { ...step.backgroundImage!, opacity: parseFloat(e.target.value) },
                        },
                      },
                    })
                  }
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Color Overlay</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'None', value: '' },
                    { label: 'Dark', value: 'rgba(0,0,0,0.5)' },
                    { label: 'Light', value: 'rgba(255,255,255,0.5)' },
                    { label: 'Primary', value: 'rgba(4,128,128,0.4)' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        border: `1.5px solid ${(step.backgroundImage?.overlay || '') === preset.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        background: (step.backgroundImage?.overlay || '') === preset.value ? 'rgba(4, 128, 128, 0.1)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: (step.backgroundImage?.overlay || '') === preset.value ? 600 : 400,
                        color: (step.backgroundImage?.overlay || '') === preset.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      }}
                      onClick={() =>
                        dispatch({
                          type: 'UPDATE_STEP',
                          payload: {
                            stepId: step.id,
                            updates: {
                              backgroundImage: { ...step.backgroundImage!, overlay: preset.value },
                            },
                          },
                        })
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={step.backgroundImage.overlay || ''}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_STEP',
                      payload: {
                        stepId: step.id,
                        updates: {
                          backgroundImage: { ...step.backgroundImage!, overlay: e.target.value },
                        },
                      },
                    })
                  }
                  placeholder="Custom: rgba(0,0,0,0.5)"
                  style={{ marginTop: '4px', width: '100%', padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', background: 'var(--color-surface)' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="step-navigation-config">
        <h4>⚙️ Step Navigation</h4>
        <div className="navigation-buttons">
          <div className="nav-button-config">
            <label>
              <input
                type="checkbox"
                checked={step.autoAdvance || false}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_STEP',
                    payload: {
                      stepId: step.id,
                      updates: { autoAdvance: e.target.checked },
                    },
                  })
                }
              />
              Auto-advance on single question
            </label>
            {step.autoAdvance && (
              <span className="help-text" style={{ display: 'block', fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                When enabled and this step has only one question, the form will automatically advance to the next step when answered.
              </span>
            )}
          </div>
          
          <div className="nav-button-config">
            <label>
              <input
                type="checkbox"
                checked={step.enterKeyAdvance || false}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_STEP',
                    payload: {
                      stepId: step.id,
                      updates: { enterKeyAdvance: e.target.checked },
                    },
                  })
                }
              />
              Allow Enter key to advance step
            </label>
            {step.enterKeyAdvance && (
              <span className="help-text" style={{ display: 'block', fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                Pressing Enter while in an input field will advance to the next step.
              </span>
            )}
          </div>
          
          <div className="nav-button-config">
            <label>
              <input
                type="checkbox"
                checked={step.scrollOnError !== false}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_STEP',
                    payload: {
                      stepId: step.id,
                      updates: { scrollOnError: e.target.checked },
                    },
                  })
                }
              />
              Scroll to first error on validation failure
            </label>
            {step.scrollOnError === false && (
              <span className="help-text" style={{ display: 'block', fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                Automatic scrolling to errors is disabled for this step.
              </span>
            )}
          </div>
          
          <div className="nav-button-config">
            <label>
              <input
                type="checkbox"
                checked={step.backButton.enabled}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_STEP',
                    payload: {
                      stepId: step.id,
                      updates: {
                        backButton: { ...step.backButton, enabled: e.target.checked },
                      },
                    },
                  })
                }
              />
              Show Back Button
            </label>
            {step.backButton.enabled && (
              <input
                type="text"
                value={step.backButton.label}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_STEP',
                    payload: {
                      stepId: step.id,
                      updates: {
                        backButton: { ...step.backButton, label: e.target.value },
                      },
                    },
                  })
                }
                placeholder="Button label"
                className="nav-button-label-input"
              />
            )}
          </div>
          
          <div className="nav-button-config">
            <label>
              <input
                type="checkbox"
                checked={step.continueButton.enabled}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_STEP',
                    payload: {
                      stepId: step.id,
                      updates: {
                        continueButton: { ...step.continueButton, enabled: e.target.checked },
                      },
                    },
                  })
                }
              />
              Show Continue Button
            </label>
            {step.continueButton.enabled && (
              <input
                type="text"
                value={step.continueButton.label}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_STEP',
                    payload: {
                      stepId: step.id,
                      updates: {
                        continueButton: { ...step.continueButton, label: e.target.value },
                      },
                    },
                  })
                }
                placeholder="Button label"
                className="nav-button-label-input"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Question Preview Component
function QuestionPreview({ question }: { question: Question }) {
  switch (question.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
      return (
        <input
          type="text"
          placeholder={question.placeholder}
          disabled
          className="preview-input"
        />
      );
    case 'currency':
      return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '8px', color: '#666', fontWeight: 500 }}>€</span>
          <input
            type="text"
            placeholder={question.placeholder || '0.00'}
            disabled
            className="preview-input"
            style={{ paddingLeft: '24px' }}
          />
        </div>
      );
    case 'numberplate':
      return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <img 
            src="/numberplate.png" 
            alt="Number Plate" 
            style={{ position: 'absolute', left: '6px', height: '18px', width: 'auto' }}
          />
          <input
            type="text"
            placeholder={question.placeholder || 'e.g. 191-D-12345'}
            disabled
            className="preview-input"
            style={{ paddingLeft: '32px' }}
          />
        </div>
      );
    case 'textarea':
      return (
        <textarea
          placeholder={question.placeholder}
          disabled
          className="preview-textarea"
          rows={2}
        />
      );
    case 'radio':
      return (
        <div className="preview-options">
          {question.options?.slice(0, 3).map((opt) => (
            <label key={opt.id} className="preview-option">
              <input type="radio" disabled /> {opt.label}
            </label>
          ))}
          {(question.options?.length || 0) > 3 && (
            <span className="preview-more">+{(question.options?.length || 0) - 3} more</span>
          )}
        </div>
      );
    case 'checkbox':
      return (
        <div className="preview-options">
          {question.options?.slice(0, 3).map((opt) => (
            <label key={opt.id} className="preview-option">
              <input type="checkbox" disabled /> {opt.label}
            </label>
          ))}
          {(question.options?.length || 0) > 3 && (
            <span className="preview-more">+{(question.options?.length || 0) - 3} more</span>
          )}
        </div>
      );
    case 'select':
    case 'multiselect':
      return (
        <select disabled className="preview-select">
          <option>{question.placeholder || 'Select...'}</option>
        </select>
      );
    case 'date':
      return <input type="date" disabled className="preview-input" />;
    case 'time':
      return <input type="time" disabled className="preview-input" />;
    case 'rating':
      return (
        <div className="preview-rating">
          {'⭐'.repeat(5)}
        </div>
      );
    case 'slider':
      return <input type="range" disabled className="preview-slider" />;
    case 'file':
      return (
        <div className="preview-file">
          <span>📎 Choose file...</span>
        </div>
      );
    case 'privacy_policy':
      return (
        <div className="preview-privacy" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input type="checkbox" disabled />
          <span style={{ fontSize: '0.85em' }}>
            I agree to the <span style={{ color: '#048080', textDecoration: 'underline' }}>Privacy Policy</span>
          </span>
        </div>
      );
    case 'helper_text':
      return (
        <div
          className="preview-helper-text"
          style={{
            textAlign: question.textAlignment || 'left',
            fontSize: '0.85em',
            color: '#666',
            padding: '4px 0',
            fontStyle: 'italic',
            whiteSpace: 'pre-wrap',
          }}
        >
          {question.helperContent || 'Helper text...'}
        </div>
      );
    default:
      return <div className="preview-default">Preview</div>;
  }
}
