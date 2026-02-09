import React, { useState, useMemo, useEffect } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { Question, Condition, ConditionRule } from '../types';

export function FormPreview() {
  const { state, dispatch } = useBuilder();
  const { form, previewMode } = state;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentStep = form.steps[currentStepIndex] || form.steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === form.steps.length - 1;

  // Calculate progress
  const progress = useMemo(() => {
    if (!currentStep) return 0;
    
    const { progressConfig, steps } = form;
    const totalSteps = steps.length;
    if (totalSteps === 0) return 0;

    switch (progressConfig.mode) {
      case 'linear':
        return ((currentStepIndex + 1) / totalSteps) * 100;
      case 'step_based':
        return ((currentStepIndex + 1) / totalSteps) * 100;
      case 'weighted':
        const weights = progressConfig.stepWeights || {};
        const totalWeight = steps.reduce((sum, s) => sum + (weights[s.id] || 1), 0);
        const completedWeight = steps
          .slice(0, currentStepIndex + 1)
          .reduce((sum, s) => sum + (weights[s.id] || 1), 0);
        return (completedWeight / totalWeight) * 100;
      case 'exponential':
        const base = progressConfig.exponentialBase || 2;
        return ((Math.pow(base, currentStepIndex + 1) - 1) / (Math.pow(base, totalSteps) - 1)) * 100;
      case 'question_based':
        const totalQuestions = steps.flatMap((s) => s.questions).length;
        const answeredQuestions = Object.keys(formData).filter((key) => formData[key]).length;
        return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
      default:
        return 0;
    }
  }, [currentStep, currentStepIndex, form, formData]);

  // Auto-navigate when conditional navigation is triggered by form data changes
  useEffect(() => {
    if (!currentStep || isSubmitting || submitted) return;

    // Check if any conditional navigation rule is triggered
    const sortedNavigation = [...currentStep.conditionalNavigation].sort(
      (a, b) => b.priority - a.priority
    );

    for (const nav of sortedNavigation) {
      if (evaluateCondition(nav.condition)) {
        console.log('Auto-navigation triggered by condition:', nav);
        
        // Small delay to allow UI to update before navigation
        setTimeout(async () => {
          if (nav.target.type === 'submit') {
            await handleSubmit();
          } else if (nav.target.type === 'specific' && nav.target.stepId) {
            const targetIndex = form.steps.findIndex((s) => s.id === nav.target.stepId);
            if (targetIndex !== -1) {
              setCurrentStepIndex(targetIndex);
            }
          } else if (nav.target.type === 'next') {
            setCurrentStepIndex(currentStepIndex + 1);
          }
        }, 300);
        
        return; // Only trigger the first matching rule
      }
    }
  }, [formData, currentStep, currentStepIndex, isSubmitting, submitted, form.steps]);

  // Safety check - if no steps exist, don't render (must be after all hooks)
  if (!currentStep) {
    return previewMode ? (
      <div className="form-preview-overlay">
        <div className="preview-container">
          <div className="preview-header">
            <h3>Form Preview</h3>
            <button className="btn-close-preview" onClick={() => dispatch({ type: 'TOGGLE_PREVIEW', payload: false })}>✕</button>
          </div>
          <div className="preview-form" style={{ padding: 40, textAlign: 'center' }}>
            <p>No steps available. Please add at least one step to your form.</p>
          </div>
        </div>
      </div>
    ) : null;
  }

  // Evaluate a condition
  const evaluateCondition = (condition: Condition): boolean => {
    const results = condition.rules.map((rule) => evaluateRule(rule));
    return condition.logic === 'AND'
      ? results.every((r) => r)
      : results.some((r) => r);
  };

  const evaluateRule = (rule: ConditionRule): boolean => {
    const value = formData[rule.questionId] || '';
    const compareValue = rule.value;

    // Handle array values (from checkbox fields)
    const isArray = Array.isArray(value);
    
    switch (rule.operator) {
      case 'equals':
        // For arrays (checkboxes), check if the array contains the value
        if (isArray) {
          return value.includes(compareValue);
        }
        return value === compareValue;
      case 'not_equals':
        if (isArray) {
          return !value.includes(compareValue);
        }
        return value !== compareValue;
      case 'contains':
        if (isArray) {
          return value.some((v: string) => String(v).includes(compareValue));
        }
        return String(value).includes(compareValue);
      case 'not_contains':
        if (isArray) {
          return !value.some((v: string) => String(v).includes(compareValue));
        }
        return !String(value).includes(compareValue);
      case 'is_empty':
        if (isArray) {
          return value.length === 0;
        }
        return !value || value === '';
      case 'is_not_empty':
        if (isArray) {
          return value.length > 0;
        }
        return value && value !== '';
      case 'greater_than':
        return Number(value) > Number(compareValue);
      case 'less_than':
        return Number(value) < Number(compareValue);
      case 'starts_with':
        if (isArray) {
          return value.some((v: string) => String(v).startsWith(compareValue));
        }
        return String(value).startsWith(compareValue);
      case 'ends_with':
        if (isArray) {
          return value.some((v: string) => String(v).endsWith(compareValue));
        }
        return String(value).endsWith(compareValue);
      default:
        return true;
    }
  };

  // Check if a question should be displayed
  const shouldShowQuestion = (question: Question): boolean => {
    if (!question.conditionalDisplay) return true;
    return evaluateCondition(question.conditionalDisplay);
  };

  // Validate current step
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\-+()]{7,}$/;
    const validEircodePrefixes = ['A41','A42','A45','A63','A67','A75','A81','A82','A83','A84','A85','A86','A91','A92','A94','A96','A98','C15','D01','D02','D03','D04','D05','D06','D6W','D07','D08','D09','D10','D11','D12','D13','D14','D15','D16','D17','D18','D20','D22','D24','E21','E25','E32','E34','E41','E45','E53','E91','F12','F23','F26','F28','F31','F35','F42','F45','F52','F56','F91','F92','F93','F94','H12','H14','H16','H18','H23','H53','H54','H62','H65','H71','H91','K32','K34','K36','K45','K56','K67','K78','N37','N39','N41','N91','P12','P14','P17','P24','P25','P31','P32','P36','P43','P47','P51','P56','P61','P67','P72','P75','P81','P85','R14','R21','R32','R35','R42','R45','R51','R56','R93','R95','T12','T23','T34','T45','T56','V14','V15','V23','V31','V35','V42','V92','V93','V94','V95','W12','W23','W34','W91','X35','X42','X91','Y14','Y21','Y25','Y34','Y35'];
    
    currentStep.questions.forEach((question) => {
      if (!shouldShowQuestion(question)) return;
      
      const key = question.fieldName || question.id;
      const value = formData[key];
      const { validation } = question;

      if (validation.required) {
        // For checkbox/multiselect (arrays), check if array is empty
        if (Array.isArray(value) && value.length === 0) {
          newErrors[key] = 'This field is required';
          return;
        }
        // For other fields, check if empty
        if (!Array.isArray(value) && (!value || value === '')) {
          newErrors[key] = 'This field is required';
          return;
        }
      }

      if (value) {
        // Type-specific validation
        if (question.type === 'email' && !emailRegex.test(String(value))) {
          newErrors[key] = 'Please enter a valid email address';
        }
        if (question.type === 'phone' && !phoneRegex.test(String(value))) {
          newErrors[key] = 'Please enter a valid phone number';
        }
        if (question.type === 'eircode') {
          const eircodeVal = String(value).replace(/\s/g, '').toUpperCase();
          const prefix = eircodeVal.substring(0, 3);
          if (eircodeVal.length < 7 || !validEircodePrefixes.includes(prefix)) {
            newErrors[key] = 'Please enter a valid Eircode (e.g. D02 X285)';
          }
        }
        
        // Number plate validation
        if (question.type === 'numberplate') {
          const plateVal = String(value).toUpperCase();
          // Pattern: 2-3 digits, dash, 1-2 letters, dash, 1-6 digits
          const numberPlateRegex = /^\d{2,3}-[A-Z]{1,2}-\d{1,6}$/;
          if (!numberPlateRegex.test(plateVal)) {
            newErrors[key] = 'Please enter a valid number plate (e.g. 191-D-12345)';
          }
        }
        
        if (validation.minLength && String(value).length < validation.minLength) {
          newErrors[key] = `Minimum ${validation.minLength} characters required`;
        }
        if (validation.maxLength && String(value).length > validation.maxLength) {
          newErrors[key] = `Maximum ${validation.maxLength} characters allowed`;
        }
        if (validation.min !== undefined && Number(value) < validation.min) {
          newErrors[key] = `Minimum value is ${validation.min}`;
        }
        if (validation.max !== undefined && Number(value) > validation.max) {
          newErrors[key] = `Maximum value is ${validation.max}`;
        }
        if (validation.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(String(value))) {
            newErrors[key] = validation.patternMessage || 'Invalid format';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle navigation
  const getNextStepIndex = (): number => {
    // Check conditional navigation rules
    const sortedNavigation = [...currentStep.conditionalNavigation].sort(
      (a, b) => b.priority - a.priority
    );

    for (const nav of sortedNavigation) {
      if (evaluateCondition(nav.condition)) {
        console.log('Conditional nav triggered:', nav);
        if (nav.target.type === 'submit') return -1; // Submit form
        if (nav.target.type === 'specific' && nav.target.stepId) {
          const targetIndex = form.steps.findIndex((s) => s.id === nav.target.stepId);
          console.log('Looking for step:', nav.target.stepId, 'found at index:', targetIndex);
          if (targetIndex !== -1) return targetIndex;
        }
        if (nav.target.type === 'next') {
          return currentStepIndex + 1;
        }
      }
    }

    // Default navigation
    if (currentStep.defaultNextStep) {
      const targetIndex = form.steps.findIndex((s) => s.id === currentStep.defaultNextStep);
      if (targetIndex !== -1) return targetIndex;
    }

    return currentStepIndex + 1;
  };

  const handleContinue = async () => {
    // Check if any conditional navigation rule is triggered
    const conditionalNavMatched = currentStep.conditionalNavigation.some(nav => {
      const result = evaluateCondition(nav.condition);
      console.log('Checking conditional nav:', { 
        condition: nav.condition, 
        formData, 
        result 
      });
      return result;
    });

    console.log('Conditional nav matched:', conditionalNavMatched);

    // Only validate if no conditional navigation matched
    if (!conditionalNavMatched && currentStep.validateOnContinue && !validateStep()) {
      console.log('Validation failed, stopping');
      return;
    }

    const nextIndex = getNextStepIndex();
    console.log('Next step index:', nextIndex, 'Current:', currentStepIndex, 'Total steps:', form.steps.length);
    
    if (nextIndex === -1 || nextIndex >= form.steps.length) {
      // Submit form
      console.log('Submitting form');
      await handleSubmit();
    } else {
      console.log('Moving to step index:', nextIndex);
      setCurrentStepIndex(nextIndex);
    }
  };

  const handleBack = () => {
    if (currentStep.defaultPrevStep) {
      const targetIndex = form.steps.findIndex((s) => s.id === currentStep.defaultPrevStep);
      if (targetIndex !== -1) {
        setCurrentStepIndex(targetIndex);
        return;
      }
    }
    setCurrentStepIndex(Math.max(0, currentStepIndex - 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const handleInputChange = (question: Question, value: any) => {
    const key = question.fieldName || question.id;
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
    
    // Auto-advance for single question steps when enabled
    if (currentStep.autoAdvance && currentStep.questions.length === 1) {
      // Check if the question has a valid value
      const hasValidValue = value !== '' && value !== null && value !== undefined && 
        !(Array.isArray(value) && value.length === 0);
      
      if (hasValidValue) {
        // Small delay to show the selection before advancing
        setTimeout(() => {
          const nextIndex = getNextStepIndex();
          if (nextIndex === -1 || nextIndex >= form.steps.length) {
            handleSubmit();
          } else {
            setCurrentStepIndex(nextIndex);
          }
        }, 400);
      }
    }
  };

  const resetPreview = () => {
    setCurrentStepIndex(0);
    setFormData({});
    setErrors({});
    setSubmitted(false);
  };

  const closePreview = () => {
    dispatch({ type: 'TOGGLE_PREVIEW', payload: false });
  };

  if (!previewMode) return null;

  const { theme, progressConfig } = form;
  const position = progressConfig.position || 'top';
  const isCardTop = position === 'card-top';
  const isCardBottom = position === 'card-bottom';
  const isTop = position === 'top' || position === 'inline';
  const isBottom = position === 'bottom';

  // Progress bar component to reuse
  const progressBar = progressConfig.enabled && (
    <div 
      className="preview-progress"
      style={{
        margin: isCardTop || isCardBottom ? 0 : undefined,
        padding: isCardTop || isCardBottom ? 0 : undefined,
      }}
    >
      {progressConfig.showStepIndicator && !isCardTop && !isCardBottom && (
        <div className="progress-indicator">
          Step {currentStepIndex + 1} of {form.steps.length}
        </div>
      )}
      <div
        className="progress-track"
        style={{
          height: theme.progressBar.height,
          borderRadius: isCardTop || isCardBottom ? 0 : theme.progressBar.borderRadius,
          backgroundColor: theme.progressBar.backgroundColor,
        }}
      >
        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: isCardTop || isCardBottom ? 0 : theme.progressBar.borderRadius,
            backgroundColor: theme.progressBar.fillColor,
            transition: `width ${progressConfig.animationDuration}ms ${theme.progressBar.animationType}`,
          }}
        />
      </div>
      {progressConfig.showPercentage && !isCardTop && !isCardBottom && (
        <div className="progress-percent">{Math.round(progress)}%</div>
      )}
    </div>
  );

  return (
    <div className="form-preview-overlay">
      <div className="preview-container">
        <div className="preview-header">
          <h3>Form Preview</h3>
          <div className="preview-actions">
            <button className="btn-reset-preview" onClick={resetPreview}>
              🔄 Reset
            </button>
            <button className="btn-close-preview" onClick={closePreview}>
              ✕
            </button>
          </div>
        </div>

        <div
          className="preview-form"
          style={{
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.baseFontSize,
            lineHeight: theme.typography.lineHeight,
          }}
        >
          {/* Form Card Wrapper */}
          <div
            className="preview-form-card"
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.borders.radius,
              overflow: 'hidden',
              border: `${theme.borders.width}px ${theme.borders.style} ${theme.colors.border}`,
            }}
          >
          {submitted ? (
            <div className="submission-success" style={{ 
              padding: theme.spacing.formPadding,
              backgroundColor: form.submissionConfig.successBackgroundColor || undefined 
            }}>
              <span className="success-icon">{form.submissionConfig.successIcon || '✅'}</span>
              <h3 style={{ color: form.submissionConfig.successTextColor || theme.colors.success }}>
                {form.submissionConfig.successMessage}
              </h3>
              <button className="btn-primary" onClick={resetPreview}>
                Start Over
              </button>
            </div>
          ) : (
            <>
              {/* Card Top Progress Bar */}
              {isCardTop && progressBar}

              {/* Main Content */}
              <div style={{ padding: theme.spacing.formPadding }}>
                {/* Top/Inline Progress Bar */}
                {(isTop) && progressBar}

                {/* Step Content */}
                <div className="preview-step">
                  <h2
                    className="step-title"
                    style={{
                      fontFamily: theme.typography.headingFontFamily,
                      color: theme.colors.text,
                    }}
                  >
                    {currentStep.title}
                  </h2>
                  {currentStep.description && (
                    <p className="step-description" style={{ color: theme.colors.textMuted }}>
                      {currentStep.description}
                    </p>
                  )}

                  <div
                    className="questions-container"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${currentStep.gridColumns}, 1fr)`,
                      gap: currentStep.gridGap,
                    }}
                  >
                    {currentStep.questions
                      .filter(shouldShowQuestion)
                      .map((question) => (
                        <div
                          key={question.id}
                          className="preview-question"
                          style={{
                            gridColumn: `${question.gridColumn} / span ${question.gridColumnSpan}`,
                            gridRow: question.gridRow || 'auto',
                          }}
                        >
                          <QuestionField
                            question={question}
                            value={formData[question.fieldName || question.id] || ''}
                            error={errors[question.fieldName || question.id]}
                            onChange={(value) => handleInputChange(question, value)}
                            theme={theme}
                          />
                        </div>
                      ))}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="preview-navigation">
                  {currentStep.backButton.enabled && !isFirstStep ? (
                    <button
                      className="btn-back"
                      onClick={handleBack}
                      style={{
                        borderRadius: theme.buttons.borderRadius,
                        padding: `${theme.buttons.paddingY}px ${theme.buttons.paddingX}px`,
                        fontSize: theme.buttons.fontSize,
                        fontWeight: theme.buttons.fontWeight,
                        textTransform: theme.buttons.textTransform,
                      }}
                    >
                      {currentStep.backButton.label}
                    </button>
                  ) : (
                    <div></div>
                  )}
                  
                  {currentStep.continueButton.enabled && (
                    <button
                      className="btn-continue"
                      onClick={handleContinue}
                      disabled={isSubmitting}
                      style={{
                        borderRadius: theme.buttons.borderRadius,
                        padding: `${theme.buttons.paddingY}px ${theme.buttons.paddingX}px`,
                        fontSize: theme.buttons.fontSize,
                        fontWeight: theme.buttons.fontWeight,
                        textTransform: theme.buttons.textTransform,
                        backgroundColor: theme.colors.primary,
                        color: 'white',
                      }}
                    >
                      {isSubmitting ? 'Submitting...' : isLastStep ? 'Submit' : currentStep.continueButton.label}
                    </button>
                  )}
                </div>

                {/* Bottom Progress Bar (inside content) */}
                {isBottom && progressBar}
              </div>

              {/* Card Bottom Progress Bar */}
              {isCardBottom && progressBar}
            </>
          )}
          </div>
        </div>

        {/* Debug Panel */}
        <div className="preview-debug">
          <details>
            <summary>Form Data (Debug)</summary>
            <pre>{JSON.stringify(formData, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}

// Question Field Component
function QuestionField({
  question,
  value,
  error,
  onChange,
  theme,
}: {
  question: Question;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  theme: any;
}) {
  const inputStyle = {
    borderRadius: theme.inputs.borderRadius,
    padding: `${theme.inputs.paddingY}px ${theme.inputs.paddingX}px`,
    fontSize: theme.inputs.fontSize,
    border: `${theme.borders.width}px ${theme.borders.style} ${error ? theme.colors.error : theme.colors.border}`,
  };

  const renderField = () => {
    switch (question.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            style={inputStyle}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            min={question.validation.min}
            max={question.validation.max}
            style={inputStyle}
          />
        );
      
      case 'currency':
        return (
          <div className="input-with-adornment" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span 
              className="input-adornment input-adornment-start"
              style={{
                position: 'absolute',
                left: '12px',
                color: theme.colors.textMuted,
                fontSize: theme.inputs.fontSize,
                fontWeight: 500,
                zIndex: 1,
                pointerEvents: 'none'
              }}
            >
              €
            </span>
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={question.placeholder || '0.00'}
              min={question.validation.min}
              max={question.validation.max}
              step="0.01"
              style={{
                ...inputStyle,
                paddingLeft: '32px',
                width: '100%'
              }}
            />
          </div>
        );
      
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            style={inputStyle}
          />
        );
      
      case 'radio':
        return (
          <div className="radio-group">
            {question.options?.map((option) => (
              <label key={option.id} className="radio-option">
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="checkbox-group">
            {question.options?.map((option) => (
              <label key={option.id} className="checkbox-option">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      onChange([...currentValues, option.value]);
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option.value));
                    }
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          >
            <option value="">{question.placeholder || 'Select...'}</option>
            {question.options?.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          />
        );
      
      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          />
        );
      
      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          />
        );
      
      case 'rating':
        return (
          <div className="rating-input">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star-btn ${value >= star ? 'active' : ''}`}
                onClick={() => onChange(star)}
                style={{
                  color: value >= star ? theme.colors.primary : '#d1d5db',
                }}
              >
                ★
              </button>
            ))}
          </div>
        );
      
      case 'slider':
        const sliderMin = question.validation.min || 0;
        const sliderMax = question.validation.max || 100;
        const sliderValue = value || sliderMin;
        const sliderPercent = ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100;
        
        return (
          <div className="slider-input">
            <input
              type="range"
              value={sliderValue}
              onChange={(e) => onChange(Number(e.target.value))}
              min={sliderMin}
              max={sliderMax}
              style={{
                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${sliderPercent}%, #e5e7eb ${sliderPercent}%, #e5e7eb 100%)`,
              }}
            />
            <span className="slider-value" style={{ color: theme.colors.primary }}>
              {sliderValue}
            </span>
          </div>
        );
      
      case 'file':
        return (
          <div className="file-input-wrapper">
            <input
              type="file"
              id={`file-${question.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file.name);
              }}
              style={{ display: 'none' }}
            />
            <label
              htmlFor={`file-${question.id}`}
              className="file-input-label"
              style={{
                borderColor: theme.colors.primary,
                color: value ? theme.colors.text : theme.colors.primary,
              }}
            >
              {value || 'Choose a file...'}
            </label>
            <button
              type="button"
              className="file-input-button"
              onClick={() => document.getElementById(`file-${question.id}`)?.click()}
              style={{
                backgroundColor: theme.colors.primary,
                color: '#fff',
              }}
            >
              Browse
            </button>
          </div>
        );
      
      case 'eircode':
        const eircodeValue = String(value || '');
        const eircodePrefix = eircodeValue.substring(0, 3).replace(/\s/g, '').toUpperCase();
        const validPrefixes = ['A41','A42','A45','A63','A67','A75','A81','A82','A83','A84','A85','A86','A91','A92','A94','A96','A98','C15','D01','D02','D03','D04','D05','D06','D6W','D07','D08','D09','D10','D11','D12','D13','D14','D15','D16','D17','D18','D20','D22','D24','E21','E25','E32','E34','E41','E45','E53','E91','F12','F23','F26','F28','F31','F35','F42','F45','F52','F56','F91','F92','F93','F94','H12','H14','H16','H18','H23','H53','H54','H62','H65','H71','H91','K32','K34','K36','K45','K56','K67','K78','N37','N39','N41','N91','P12','P14','P17','P24','P25','P31','P32','P36','P43','P47','P51','P56','P61','P67','P72','P75','P81','P85','R14','R21','R32','R35','R42','R45','R51','R56','R93','R95','T12','T23','T34','T45','T56','V14','V15','V23','V31','V35','V42','V92','V93','V94','V95','W12','W23','W34','W91','X35','X42','X91','Y14','Y21','Y25','Y34','Y35'];
        const isValidEircode = eircodePrefix.length >= 3 && validPrefixes.includes(eircodePrefix);
        const showEircodeFinder = eircodePrefix.length >= 3 && !isValidEircode;
        
        return (
          <>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (val.length > 3) {
                  val = val.substring(0, 3) + ' ' + val.substring(3, 7);
                }
                onChange(val.trim());
              }}
              placeholder={question.placeholder || 'e.g. D02 X285'}
              maxLength={8}
              style={{ ...inputStyle, textTransform: 'uppercase' }}
            />
            {showEircodeFinder && (
              <a 
                href="https://finder.eircode.ie/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'block', marginTop: '4px', fontSize: '0.875em', color: theme.colors.primary }}
              >
                Find your Eircode
              </a>
            )}
          </>
        );
      
      case 'numberplate':
        return (
          <div className="input-with-adornment" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <img 
              src="/numberplate.png" 
              alt="Number Plate" 
              className="input-adornment input-adornment-start"
              style={{
                position: 'absolute',
                left: '8px',
                height: '36px',
                width: 'auto',
                zIndex: 1,
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => {
                // Format number plate: YY-C-NNNNNN
                let v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                let noDashes = v.replace(/-/g, '');
                let year = '', county = '', seq = '';
                let i = 0;
                while (i < noDashes.length && /\d/.test(noDashes[i]) && year.length < 3) {
                  year += noDashes[i]; i++;
                }
                while (i < noDashes.length && /[A-Z]/.test(noDashes[i]) && county.length < 2) {
                  county += noDashes[i]; i++;
                }
                while (i < noDashes.length && /\d/.test(noDashes[i]) && seq.length < 6) {
                  seq += noDashes[i]; i++;
                }
                let result = year;
                if (county) result += '-' + county;
                if (seq) result += '-' + seq;
                onChange(result);
              }}
              placeholder={question.placeholder || 'e.g. 191-D-12345'}
              maxLength={12}
              style={{ 
                ...inputStyle, 
                textTransform: 'uppercase',
                paddingLeft: '40px',
                width: '100%'
              }}
            />
          </div>
        );
      
      case 'privacy_policy':
        const policyUrl = question.privacyPolicyUrl || '#';
        const policyText = question.privacyPolicyText || 'I agree to the';
        return (
          <div className="privacy-policy-field">
            <label className="checkbox-option" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={value === true || value === 'true' || value === 'accepted'}
                onChange={(e) => onChange(e.target.checked ? 'accepted' : '')}
                style={{ marginTop: '3px' }}
              />
              <span>
                {policyText}{' '}
                <a 
                  href={policyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: theme.colors.primary, textDecoration: 'underline' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>
        );
      
      default:
        return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;
    }
  };

  return (
    <div className={`question-field ${error ? 'has-error' : ''}`}>
      <label className="question-label" style={{ color: theme.colors.text }}>
        {question.label}
        {question.validation.required && <span className="required-star">*</span>}
      </label>
      {renderField()}
      {question.helpText && (
        <span className="help-text" style={{ color: theme.colors.textMuted }}>
          {question.helpText}
        </span>
      )}
      {error && (
        <span className="error-text" style={{ color: theme.colors.error }}>
          {error}
        </span>
      )}
    </div>
  );
}
