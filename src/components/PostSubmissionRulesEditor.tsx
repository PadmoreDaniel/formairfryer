import React, { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { PostSubmissionRedirectRule, PostSubmissionRedirectTarget, ApiResponseRedirectMapping, ConditionOperator } from '../types';
import { generateId, createPostSubmissionRule } from '../utils/defaults';

export function PostSubmissionRulesEditor() {
  const { state, dispatch } = useBuilder();
  const { form } = state;
  const rules = form.submissionConfig.postSubmissionRules || [];

  const allQuestions = form.steps.flatMap((s) => s.questions);

  const operators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
    { value: 'age_greater_than', label: 'age is greater than' },
    { value: 'age_less_than', label: 'age is less than' },
  ];

  const updateRules = (newRules: PostSubmissionRedirectRule[]) => {
    dispatch({
      type: 'UPDATE_SUBMISSION_CONFIG',
      payload: { postSubmissionRules: newRules },
    });
  };

  const addRule = () => {
    const newRule = createPostSubmissionRule();
    updateRules([...rules, newRule]);
  };

  const updateRule = (ruleId: string, updates: Partial<PostSubmissionRedirectRule>) => {
    updateRules(rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)));
  };

  const deleteRule = (ruleId: string) => {
    updateRules(rules.filter((r) => r.id !== ruleId));
  };

  return (
    <div className="post-submission-rules-editor">
      <h4 className="post-submission-rules-title">
        Conditional Redirects
      </h4>
      <p className="post-submission-rules-description">
        Define rules to redirect users to different URLs based on their answers, or call an API to determine the redirect destination. Rules are evaluated in priority order — first match wins. Falls back to the default redirect above if no rules match.
      </p>

      {rules.length === 0 ? (
        <div className="post-submission-rules-empty">
          <p>No conditional redirect rules defined.</p>
        </div>
      ) : (
        <div className="rules-list">
          {[...rules]
            .sort((a, b) => b.priority - a.priority)
            .map((rule, index) => (
              <RedirectRuleEditor
                key={rule.id}
                rule={rule}
                index={index}
                availableQuestions={allQuestions}
                operators={operators}
                onUpdate={(updates) => updateRule(rule.id, updates)}
                onDelete={() => deleteRule(rule.id)}
              />
            ))}
        </div>
      )}

      <button className="btn-add-rule" onClick={addRule}>
        + Add Redirect Rule
      </button>
    </div>
  );
}

interface RedirectRuleEditorProps {
  rule: PostSubmissionRedirectRule;
  index: number;
  availableQuestions: { id: string; label: string }[];
  operators: { value: ConditionOperator; label: string }[];
  onUpdate: (updates: Partial<PostSubmissionRedirectRule>) => void;
  onDelete: () => void;
}

function RedirectRuleEditor({
  rule,
  index,
  availableQuestions,
  operators,
  onUpdate,
  onDelete,
}: RedirectRuleEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const condition = rule.condition;

  const updateCondition = (updates: Partial<typeof condition>) => {
    onUpdate({ condition: { ...condition, ...updates } });
  };

  const addConditionRule = () => {
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

  const updateConditionRule = (ruleId: string, updates: Partial<typeof condition.rules[0]>) => {
    updateCondition({
      rules: condition.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
    });
  };

  const deleteConditionRule = (ruleId: string) => {
    if (condition.rules.length <= 1) return;
    updateCondition({
      rules: condition.rules.filter((r) => r.id !== ruleId),
    });
  };

  const updateTarget = (updates: Partial<PostSubmissionRedirectTarget>) => {
    onUpdate({ target: { ...rule.target, ...updates } });
  };

  const updateApiConfig = (updates: Partial<NonNullable<PostSubmissionRedirectTarget['apiConfig']>>) => {
    const currentApiConfig = rule.target.apiConfig || { method: 'POST' as const, redirectField: '' };
    onUpdate({
      target: {
        ...rule.target,
        apiConfig: { ...currentApiConfig, ...updates },
      },
    });
  };

  const targetSummary = rule.target.type === 'api'
    ? `API → ${rule.target.url || '(no endpoint)'}`
    : rule.target.url || '(no URL)';

  return (
    <div className="navigation-rule">
      <div className="rule-header" onClick={() => setExpanded(!expanded)}>
        <span className="rule-toggle">{expanded ? '▼' : '▶'}</span>
        <span className="rule-priority">Priority: {rule.priority}</span>
        <span className="rule-summary">
          {condition.rules.length} condition{condition.rules.length !== 1 ? 's' : ''} → {targetSummary}
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
              value={rule.priority}
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

            {condition.rules.map((condRule, ruleIndex) => (
              <div key={condRule.id} className="condition-rule-row">
                {ruleIndex > 0 && (
                  <span className="condition-connector">{condition.logic}</span>
                )}
                <select
                  value={condRule.questionId}
                  onChange={(e) => updateConditionRule(condRule.id, { questionId: e.target.value })}
                >
                  <option value="">Select question...</option>
                  {availableQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
                <select
                  value={condRule.operator}
                  onChange={(e) => updateConditionRule(condRule.id, { operator: e.target.value as ConditionOperator })}
                >
                  {operators.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                {!['is_empty', 'is_not_empty'].includes(condRule.operator) && (
                  <input
                    type="text"
                    value={condRule.value}
                    onChange={(e) => updateConditionRule(condRule.id, { value: e.target.value })}
                    placeholder="Value"
                  />
                )}
                <button
                  className="btn-icon btn-delete"
                  onClick={() => deleteConditionRule(condRule.id)}
                  disabled={condition.rules.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="btn-add-condition" onClick={addConditionRule}>
              + Add Condition
            </button>
          </div>

          <div className="rule-target">
            <h5>Then redirect via</h5>
            <div className="target-selector">
              <select
                value={rule.target.type}
                onChange={(e) => updateTarget({ type: e.target.value as 'url' | 'api' })}
              >
                <option value="url">Direct URL</option>
                <option value="api">API Response</option>
              </select>

              {rule.target.type === 'url' && (
                <input
                  type="url"
                  value={rule.target.url}
                  onChange={(e) => updateTarget({ url: e.target.value })}
                  placeholder="https://example.com/page"
                />
              )}

              {rule.target.type === 'api' && (
                <div className="api-config">
                  <div className="form-group">
                    <label>API Endpoint</label>
                    <input
                      type="url"
                      value={rule.target.url}
                      onChange={(e) => updateTarget({ url: e.target.value })}
                      placeholder="https://api.example.com/get-risk-level"
                    />
                  </div>
                  <div className="form-group">
                    <label>Method</label>
                    <select
                      value={rule.target.apiConfig?.method || 'POST'}
                      onChange={(e) => updateApiConfig({ method: e.target.value as 'GET' | 'POST' })}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </div>
                  {rule.target.apiConfig?.method !== 'GET' && (
                    <div className="form-group">
                      <label>Body Template (JSON)</label>
                      <textarea
                        value={rule.target.apiConfig?.bodyTemplate || ''}
                        onChange={(e) => updateApiConfig({ bodyTemplate: e.target.value })}
                        placeholder={'{"occupation": "{{occcupation}}"}'}
                        rows={3}
                      />
                      <span className="hint">Use {'{{fieldName}}'} to reference form answers</span>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Response Field</label>
                    <input
                      type="text"
                      value={rule.target.apiConfig?.redirectField || ''}
                      onChange={(e) => updateApiConfig({ redirectField: e.target.value })}
                      placeholder="risk"
                    />
                    <span className="hint">JSON path to extract the value from the API response (e.g. "risk" or "data.redirectUrl")</span>
                  </div>

                  <div className="response-redirect-map">
                    <label>Response Value → Redirect URL Mapping</label>
                    <span className="hint">Map specific response values to redirect URLs. If the response value is a full URL and no mapping matches, it will be used directly as the redirect.</span>
                    
                    {(rule.target.apiConfig?.responseRedirectMap || []).map((mapping, idx) => (
                      <div key={idx} className="response-map-row">
                        <input
                          type="text"
                          value={mapping.value}
                          onChange={(e) => {
                            const newMap = [...(rule.target.apiConfig?.responseRedirectMap || [])];
                            newMap[idx] = { ...newMap[idx], value: e.target.value };
                            updateApiConfig({ responseRedirectMap: newMap });
                          }}
                          placeholder="Response value (e.g. Declined)"
                        />
                        <span className="response-map-arrow">→</span>
                        <input
                          type="url"
                          value={mapping.url}
                          onChange={(e) => {
                            const newMap = [...(rule.target.apiConfig?.responseRedirectMap || [])];
                            newMap[idx] = { ...newMap[idx], url: e.target.value };
                            updateApiConfig({ responseRedirectMap: newMap });
                          }}
                          placeholder="https://example.com/redirect-page"
                        />
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => {
                            const newMap = (rule.target.apiConfig?.responseRedirectMap || []).filter((_, i) => i !== idx);
                            updateApiConfig({ responseRedirectMap: newMap });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    
                    <button
                      className="btn-add-condition"
                      onClick={() => {
                        const newMap: ApiResponseRedirectMapping[] = [
                          ...(rule.target.apiConfig?.responseRedirectMap || []),
                          { value: '', url: '' },
                        ];
                        updateApiConfig({ responseRedirectMap: newMap });
                      }}
                    >
                      + Add Mapping
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Default Redirect URL (if no mapping matches)</label>
                    <input
                      type="url"
                      value={rule.target.apiConfig?.defaultRedirectUrl || ''}
                      onChange={(e) => updateApiConfig({ defaultRedirectUrl: e.target.value })}
                      placeholder="https://example.com/fallback"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
