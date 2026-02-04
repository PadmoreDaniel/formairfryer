import React from 'react';
import { useBuilder } from '../context/BuilderContext';
import { ProgressMode, ProgressBarPosition } from '../types';

export function ProgressBarEditor() {
  const { state, dispatch } = useBuilder();
  const { progressConfig } = state.form;

  const updateConfig = (updates: Partial<typeof progressConfig>) => {
    dispatch({ type: 'UPDATE_PROGRESS_CONFIG', payload: updates });
  };

  const progressModes: { value: ProgressMode; label: string; description: string }[] = [
    { value: 'linear', label: 'Linear', description: 'Equal progress per step' },
    { value: 'step_based', label: 'Step Based', description: 'Progress based on current step number' },
    { value: 'weighted', label: 'Weighted', description: 'Custom weight for each step' },
    { value: 'exponential', label: 'Exponential', description: 'Progress increases exponentially' },
    { value: 'question_based', label: 'Question Based', description: 'Based on questions answered' },
  ];

  const positionOptions: { value: ProgressBarPosition; label: string; description: string }[] = [
    { value: 'top', label: 'Top', description: 'Above the form container' },
    { value: 'bottom', label: 'Bottom', description: 'Below the form container' },
    { value: 'card-top', label: 'Card Top Border', description: 'Progress bar as top border of form card' },
    { value: 'card-bottom', label: 'Card Bottom Border', description: 'Progress bar as bottom border' },
    { value: 'inline', label: 'Inline', description: 'Inside step header area' },
  ];

  return (
    <div className="progress-bar-editor">
      <div className="editor-header">
        <h3>Progress Bar</h3>
      </div>

      <div className="editor-section">
        <div className="form-group checkbox-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={progressConfig.enabled}
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
            />
            <span className="toggle-text">Enable Progress Bar</span>
          </label>
        </div>

        {progressConfig.enabled && (
          <>
            <div className="form-group">
              <label>Position</label>
              <div className="mode-selector">
                {positionOptions.map((pos) => (
                  <div
                    key={pos.value}
                    className={`mode-option ${progressConfig.position === pos.value ? 'selected' : ''}`}
                    onClick={() => updateConfig({ position: pos.value })}
                  >
                    <span className="mode-label">{pos.label}</span>
                    <span className="mode-description">{pos.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Progress Mode</label>
              <div className="mode-selector">
                {progressModes.map((mode) => (
                  <div
                    key={mode.value}
                    className={`mode-option ${progressConfig.mode === mode.value ? 'selected' : ''}`}
                    onClick={() => updateConfig({ mode: mode.value })}
                  >
                    <span className="mode-label">{mode.label}</span>
                    <span className="mode-description">{mode.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {progressConfig.mode === 'weighted' && (
              <div className="form-group">
                <label>Step Weights</label>
                <div className="step-weights">
                  {state.form.steps.map((step) => (
                    <div key={step.id} className="weight-item">
                      <span className="weight-step-name">{step.title}</span>
                      <input
                        type="number"
                        value={progressConfig.stepWeights?.[step.id] ?? 1}
                        onChange={(e) =>
                          updateConfig({
                            stepWeights: {
                              ...progressConfig.stepWeights,
                              [step.id]: parseFloat(e.target.value) || 1,
                            },
                          })
                        }
                        min={0}
                        step={0.1}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {progressConfig.mode === 'exponential' && (
              <div className="form-group">
                <label>Exponential Base (default: 2)</label>
                <input
                  type="number"
                  value={progressConfig.exponentialBase ?? 2}
                  onChange={(e) =>
                    updateConfig({ exponentialBase: parseFloat(e.target.value) || 2 })
                  }
                  min={1.1}
                  max={10}
                  step={0.1}
                />
              </div>
            )}

            <div className="form-group">
              <label>Display Options</label>
              <div className="checkbox-list">
                <label>
                  <input
                    type="checkbox"
                    checked={progressConfig.showPercentage}
                    onChange={(e) => updateConfig({ showPercentage: e.target.checked })}
                  />
                  Show Percentage
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={progressConfig.showStepIndicator}
                    onChange={(e) => updateConfig({ showStepIndicator: e.target.checked })}
                  />
                  Show Step Indicator (e.g., "Step 2 of 5")
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={progressConfig.showStepLabels}
                    onChange={(e) => updateConfig({ showStepLabels: e.target.checked })}
                  />
                  Show Step Labels
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Animation Duration (ms)</label>
              <input
                type="number"
                value={progressConfig.animationDuration}
                onChange={(e) =>
                  updateConfig({ animationDuration: parseInt(e.target.value) || 300 })
                }
                min={0}
                max={2000}
                step={50}
              />
            </div>

            <div className="progress-preview">
              <h4>Preview</h4>
              <ProgressBarPreview />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProgressBarPreview() {
  const { state } = useBuilder();
  const { progressConfig, theme, steps } = state.form;
  
  // Simulate being on step 2
  const currentStep = 1;
  const totalSteps = steps.length;
  
  let progress = 0;
  
  switch (progressConfig.mode) {
    case 'linear':
      progress = ((currentStep + 1) / totalSteps) * 100;
      break;
    case 'step_based':
      progress = ((currentStep + 1) / totalSteps) * 100;
      break;
    case 'weighted':
      const weights = progressConfig.stepWeights || {};
      const totalWeight = steps.reduce((sum, s) => sum + (weights[s.id] || 1), 0);
      const completedWeight = steps
        .slice(0, currentStep + 1)
        .reduce((sum, s) => sum + (weights[s.id] || 1), 0);
      progress = (completedWeight / totalWeight) * 100;
      break;
    case 'exponential':
      const base = progressConfig.exponentialBase || 2;
      progress = ((Math.pow(base, currentStep + 1) - 1) / (Math.pow(base, totalSteps) - 1)) * 100;
      break;
    case 'question_based':
      // For preview, just show linear
      progress = ((currentStep + 1) / totalSteps) * 100;
      break;
  }

  const position = progressConfig.position || 'top';
  const isCardTop = position === 'card-top';
  const isCardBottom = position === 'card-bottom';
  const isCardPosition = isCardTop || isCardBottom;
  const progressHeight = theme.progressBar.height || 6;

  // Standard progress bar element
  const progressBarElement = (
    <div
      style={{
        height: progressHeight,
        borderRadius: isCardPosition ? 0 : theme.progressBar.borderRadius,
        backgroundColor: theme.progressBar.backgroundColor,
        width: '100%',
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          borderRadius: isCardPosition ? 0 : theme.progressBar.borderRadius,
          backgroundColor: theme.progressBar.fillColor,
          transition: `width ${progressConfig.animationDuration}ms ${theme.progressBar.animationType}`,
        }}
      />
    </div>
  );

  // Sample form content
  const formContent = (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: theme.colors.text, fontSize: 14 }}>
        Sample Form Content
      </div>
      <div style={{ 
        height: 32, 
        background: theme.colors.surface, 
        borderRadius: theme.inputs.borderRadius,
        border: `1px solid ${theme.colors.border}`,
      }} />
    </div>
  );

  // Render based on position
  const renderPreview = () => {
    if (isCardTop) {
      return (
        <div style={{
          borderRadius: theme.borders.radius,
          overflow: 'hidden',
          border: `1px solid ${theme.colors.border}`,
        }}>
          {/* Progress bar as top border - spans full width */}
          <div
            style={{
              height: progressHeight + 2,
              backgroundColor: theme.progressBar.backgroundColor,
              width: '100%',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: theme.progressBar.fillColor,
                transition: `width ${progressConfig.animationDuration}ms ${theme.progressBar.animationType}`,
              }}
            />
          </div>
          <div style={{ background: theme.colors.background }}>
            {formContent}
          </div>
        </div>
      );
    }
    
    if (isCardBottom) {
      return (
        <div style={{
          borderRadius: theme.borders.radius,
          overflow: 'hidden',
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{ background: theme.colors.background }}>
            {formContent}
          </div>
          {/* Progress bar as bottom border - spans full width */}
          <div
            style={{
              height: progressHeight + 2,
              backgroundColor: theme.progressBar.backgroundColor,
              width: '100%',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: theme.progressBar.fillColor,
                transition: `width ${progressConfig.animationDuration}ms ${theme.progressBar.animationType}`,
              }}
            />
          </div>
        </div>
      );
    }
    
    if (position === 'bottom') {
      return (
        <div style={{
          background: theme.colors.background,
          borderRadius: theme.borders.radius,
          border: `1px solid ${theme.colors.border}`,
          padding: 16,
        }}>
          {formContent}
          <div style={{ marginTop: 16 }}>
            {progressConfig.showStepIndicator && (
              <div style={{ marginBottom: 8, color: theme.colors.textMuted, fontSize: 12 }}>
                Step {currentStep + 1} of {totalSteps}
              </div>
            )}
            {progressBarElement}
            {progressConfig.showPercentage && (
              <div style={{ marginTop: 8, color: theme.colors.textMuted, fontSize: 12 }}>
                {Math.round(progress)}%
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Default: top or inline
    return (
      <div style={{
        background: theme.colors.background,
        borderRadius: theme.borders.radius,
        border: `1px solid ${theme.colors.border}`,
        padding: 16,
      }}>
        <div style={{ marginBottom: 16 }}>
          {progressConfig.showStepIndicator && (
            <div style={{ marginBottom: 8, color: theme.colors.textMuted, fontSize: 12 }}>
              Step {currentStep + 1} of {totalSteps}
            </div>
          )}
          {progressBarElement}
          {progressConfig.showPercentage && (
            <div style={{ marginTop: 8, color: theme.colors.textMuted, fontSize: 12 }}>
              {Math.round(progress)}%
            </div>
          )}
        </div>
        {formContent}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        fontSize: 12, 
        color: theme.colors.textMuted, 
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>Position:</span>
        <span style={{ 
          background: theme.colors.primary, 
          color: 'white', 
          padding: '2px 8px', 
          borderRadius: 4,
          fontWeight: 500,
        }}>
          {position.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </span>
      </div>
      {renderPreview()}
      
      {progressConfig.showStepLabels && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {steps.map((step, index) => (
            <span
              key={step.id}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: index <= currentStep ? theme.colors.primary : theme.colors.surface,
                color: index <= currentStep ? 'white' : theme.colors.textMuted,
              }}
            >
              {step.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
