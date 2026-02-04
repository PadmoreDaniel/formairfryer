import React, { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { ConditionalNavigation, ConditionOperator, NavigationTarget } from '../types';
import { generateId, createConditionalNavigation } from '../utils/defaults';

export function ConditionalNavigationEditor() {
  const { state, dispatch, getSelectedStep } = useBuilder();
  const step = getSelectedStep();

  if (!step) {
    return null;
  }

  const allSteps = state.form.steps;
  const currentStepIndex = allSteps.findIndex((s) => s.id === step.id);
  const otherSteps = allSteps.filter((s) => s.id !== step.id);

  const addNavigation = () => {
    const newNav = createConditionalNavigation();
    dispatch({
      type: 'ADD_CONDITIONAL_NAVIGATION',
      payload: { stepId: step.id, navigation: newNav },
    });
  };

  const updateNavigation = (navId: string, updates: Partial<ConditionalNavigation>) => {
    dispatch({
      type: 'UPDATE_CONDITIONAL_NAVIGATION',
      payload: { stepId: step.id, navigationId: navId, updates },
    });
  };

  const deleteNavigation = (navId: string) => {
    dispatch({
      type: 'DELETE_CONDITIONAL_NAVIGATION',
      payload: { stepId: step.id, navigationId: navId },
    });
  };

  const operators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
  ];

  // Get all questions from current and previous steps
  const availableQuestions = allSteps
    .slice(0, currentStepIndex + 1)
    .flatMap((s) => s.questions);

  return (
    <div className="conditional-navigation-editor">
      <div className="editor-header">
        <h3>Conditional Navigation</h3>
        <p className="editor-description">
          Define rules to skip or jump to specific steps based on user answers.
        </p>
      </div>

      <div className="default-navigation">
        <h4>Default Navigation</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Previous Step</label>
            <select
              value={step.defaultPrevStep || ''}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_STEP',
                  payload: {
                    stepId: step.id,
                    updates: { defaultPrevStep: e.target.value || undefined },
                  },
                })
              }
            >
              <option value="">First previous step</option>
              {allSteps.slice(0, currentStepIndex).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Next Step</label>
            <select
              value={step.defaultNextStep || ''}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_STEP',
                  payload: {
                    stepId: step.id,
                    updates: { defaultNextStep: e.target.value || undefined },
                  },
                })
              }
            >
              <option value="">Next sequential step</option>
              {allSteps.slice(currentStepIndex + 1).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
              <option value="__submit__">Submit form</option>
            </select>
          </div>
        </div>
      </div>

      <div className="conditional-rules">
        <h4>Conditional Rules</h4>
        <p className="rules-description">
          Rules are evaluated in order of priority. First matching rule determines navigation.
        </p>

        {step.conditionalNavigation.length === 0 ? (
          <div className="no-rules">
            <p>No conditional navigation rules defined.</p>
          </div>
        ) : (
          <div className="rules-list">
            {step.conditionalNavigation
              .sort((a, b) => b.priority - a.priority)
              .map((nav, index) => (
                <NavigationRuleEditor
                  key={nav.id}
                  navigation={nav}
                  index={index}
                  availableQuestions={availableQuestions}
                  otherSteps={otherSteps}
                  operators={operators}
                  onUpdate={(updates) => updateNavigation(nav.id, updates)}
                  onDelete={() => deleteNavigation(nav.id)}
                />
              ))}
          </div>
        )}

        <button className="btn-add-rule" onClick={addNavigation}>
          + Add Navigation Rule
        </button>
      </div>
    </div>
  );
}

interface NavigationRuleEditorProps {
  navigation: ConditionalNavigation;
  index: number;
  availableQuestions: { id: string; label: string }[];
  otherSteps: { id: string; title: string }[];
  operators: { value: ConditionOperator; label: string }[];
  onUpdate: (updates: Partial<ConditionalNavigation>) => void;
  onDelete: () => void;
}

function NavigationRuleEditor({
  navigation,
  index,
  availableQuestions,
  otherSteps,
  operators,
  onUpdate,
  onDelete,
}: NavigationRuleEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const condition = navigation.condition;

  const updateCondition = (updates: Partial<typeof condition>) => {
    onUpdate({ condition: { ...condition, ...updates } });
  };

  const addRule = () => {
    updateCondition({
      rules: [
        ...condition.rules,
        {
          id: generateId(),
          questionId: availableQuestions[0]?.id || '',
          operator: 'equals',
          value: '',
        },
      ],
    });
  };

  const updateRule = (ruleId: string, updates: Partial<typeof condition.rules[0]>) => {
    updateCondition({
      rules: condition.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
    });
  };

  const deleteRule = (ruleId: string) => {
    if (condition.rules.length <= 1) return;
    updateCondition({
      rules: condition.rules.filter((r) => r.id !== ruleId),
    });
  };

  const updateTarget = (updates: Partial<NavigationTarget>) => {
    onUpdate({ target: { ...navigation.target, ...updates } });
  };

  return (
    <div className="navigation-rule">
      <div className="rule-header" onClick={() => setExpanded(!expanded)}>
        <span className="rule-toggle">{expanded ? '▼' : '▶'}</span>
        <span className="rule-priority">Priority: {navigation.priority}</span>
        <span className="rule-summary">
          {condition.rules.length} condition{condition.rules.length !== 1 ? 's' : ''} →{' '}
          {navigation.target.type === 'specific'
            ? otherSteps.find((s) => s.id === navigation.target.stepId)?.title || 'Unknown step'
            : navigation.target.type === 'submit'
            ? 'Submit form'
            : navigation.target.type}
        </span>
        <button
          className="btn-icon btn-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          🗑️
        </button>
      </div>

      {expanded && (
        <div className="rule-content">
          <div className="rule-priority-editor">
            <label>Priority (higher = evaluated first)</label>
            <input
              type="number"
              value={navigation.priority}
              onChange={(e) => onUpdate({ priority: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="rule-conditions">
            <h5>When</h5>
            {condition.rules.length > 1 && (
              <div className="logic-selector">
                <select
                  value={condition.logic}
                  onChange={(e) => updateCondition({ logic: e.target.value as 'AND' | 'OR' })}
                >
                  <option value="AND">ALL conditions match</option>
                  <option value="OR">ANY condition matches</option>
                </select>
              </div>
            )}

            {condition.rules.map((rule, ruleIndex) => (
              <div key={rule.id} className="condition-rule-row">
                {ruleIndex > 0 && (
                  <span className="condition-connector">{condition.logic}</span>
                )}
                <select
                  value={rule.questionId}
                  onChange={(e) => updateRule(rule.id, { questionId: e.target.value })}
                >
                  <option value="">Select question...</option>
                  {availableQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(rule.id, { operator: e.target.value as ConditionOperator })}
                >
                  {operators.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    placeholder="Value"
                  />
                )}
                <button
                  className="btn-icon btn-delete"
                  onClick={() => deleteRule(rule.id)}
                  disabled={condition.rules.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="btn-add-condition" onClick={addRule}>
              + Add Condition
            </button>
          </div>

          <div className="rule-target">
            <h5>Then navigate to</h5>
            <div className="target-selector">
              <select
                value={navigation.target.type}
                onChange={(e) =>
                  updateTarget({ type: e.target.value as NavigationTarget['type'] })
                }
              >
                <option value="next">Next step</option>
                <option value="previous">Previous step</option>
                <option value="specific">Specific step</option>
                <option value="submit">Submit form</option>
                <option value="url">External URL</option>
              </select>

              {navigation.target.type === 'specific' && (
                <select
                  value={navigation.target.stepId || ''}
                  onChange={(e) => updateTarget({ stepId: e.target.value })}
                >
                  <option value="">Select step...</option>
                  {otherSteps.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              )}

              {navigation.target.type === 'url' && (
                <input
                  type="url"
                  value={navigation.target.url || ''}
                  onChange={(e) => updateTarget({ url: e.target.value })}
                  placeholder="https://example.com"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
