import React from 'react';
import { useBuilder } from '../context/BuilderContext';
import { Step, ConditionalNavigation } from '../types';

export function StepFlowVisualization() {
  const { state, dispatch } = useBuilder();
  const { steps } = state.form;

  const handleStepClick = (stepId: string) => {
    dispatch({ type: 'SELECT_STEP', payload: { stepId } });
  };

  return (
    <div className="step-flow">
      <div className="step-flow-header">
        <h3>Form Step Flow</h3>
        <span className="step-count">{steps.length} steps</span>
      </div>

      <div className="flow-description">
        Visual overview of your form's step progression and conditional navigation paths.
      </div>

      <div className="flow-diagram">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <FlowStep 
              step={step} 
              index={index} 
              totalSteps={steps.length}
              allSteps={steps}
              onClick={() => handleStepClick(step.id)}
            />
            {index < steps.length - 1 && (
              <div className="flow-connector">
                <div className="flow-connector-line" />
              </div>
            )}
          </React.Fragment>
        ))}

        {/* Final submission indicator */}
        <div className="flow-connector">
          <div className="flow-connector-line" />
        </div>
        <div className="flow-end">
          <div className="flow-end-icon">✓</div>
          <span>Form Submission</span>
        </div>
      </div>
    </div>
  );
}

interface FlowStepProps {
  step: Step;
  index: number;
  totalSteps: number;
  allSteps: Step[];
  onClick: () => void;
}

function FlowStep({ step, index, totalSteps, allSteps, onClick }: FlowStepProps) {
  const conditionalNavs = step.conditionalNavigation || [];
  const hasConditionalNav = conditionalNavs.length > 0;
  const isLastStep = index === totalSteps - 1;

  // Determine navigation targets
  const getTargetLabel = (nav: ConditionalNavigation): string => {
    if (nav.target.type === 'next') return 'Next step';
    if (nav.target.type === 'submit') return 'Submit form';
    if (nav.target.type === 'specific' && nav.target.stepId) {
      const targetStep = allSteps.find(s => s.id === nav.target.stepId);
      return targetStep ? `Go to: ${targetStep.title}` : 'Unknown step';
    }
    return 'Default';
  };

  return (
    <div className="flow-step" onClick={onClick}>
      <div className="flow-step-number">{index + 1}</div>
      <div className="flow-step-content">
        <div className="flow-step-title">{step.title || `Step ${index + 1}`}</div>
        <div className="flow-step-questions">
          {step.questions.length} question{step.questions.length !== 1 ? 's' : ''}
        </div>
        
        <div className="flow-step-navigation">
          {/* Default navigation */}
          <span className="flow-nav-tag default">
            {isLastStep ? 'Submit' : `→ Step ${index + 2}`}
          </span>
          
          {/* Conditional navigations */}
          {conditionalNavs.slice(0, 2).map((nav, navIndex) => (
            <span key={navIndex} className="flow-nav-tag conditional">
              If condition → {getTargetLabel(nav)}
            </span>
          ))}
          
          {conditionalNavs.length > 2 && (
            <span className="flow-nav-tag more">
              +{conditionalNavs.length - 2} more rules
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
