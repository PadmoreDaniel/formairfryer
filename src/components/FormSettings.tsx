import React, { useState, useEffect, useCallback } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { useAuth } from '../context/AuthContext';
import { getUserProjects, SavedProject } from '../services/formService';
import { createDefaultInheritance, generateChildId } from '../utils/defaults';
import { PostSubmissionRulesEditor } from './PostSubmissionRulesEditor';
import { InheritableSection } from '../types';

const inheritanceSections: { key: InheritableSection; label: string; hint: string }[] = [
  { key: 'theme', label: 'Theme', hint: 'Colors, typography, spacing, borders, buttons and inputs.' },
  { key: 'layout', label: 'Step layout', hint: 'Grid columns, gaps, min height and content alignment.' },
  { key: 'progress', label: 'Progress bar', hint: 'Progress mode, position and animation.' },
  { key: 'submission', label: 'Submission', hint: 'Thank-you behavior, redirects and destination defaults.' },
  { key: 'plugin', label: 'Plugin / export', hint: 'Plugin name, slug and shortcode.' },
  { key: 'analytics', label: 'Analytics', hint: 'Whether tracking is enabled and the sampling rate.' },
];

export function FormSettings() {
  const { state, dispatch } = useBuilder();
  const { user } = useAuth();
  const { form } = state;
  const currentProject = state.currentProject;
  const [activeTab, setActiveTab] = useState<'general' | 'submission' | 'plugin'>('general');
  const [projects, setProjects] = useState<SavedProject[]>([]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setProjects([]);
      return;
    }
    getUserProjects(user.uid)
      .then((list) => { if (active) setProjects(list); })
      .catch(() => { if (active) setProjects([]); });
    return () => { active = false; };
  }, [user]);

  const updateForm = (updates: Partial<typeof form>) => {
    dispatch({ type: 'UPDATE_FORM', payload: updates });
  };

  // Assign the current form to a project (or detach it). Existing forms keep
  // their own look by default (no inherited sections) so linking never causes
  // a surprise visual change; the user can opt in per section afterwards.
  const handleAssignProject = useCallback((projectId: string) => {
    if (!projectId) {
      dispatch({ type: 'SET_PROJECT', payload: null });
      dispatch({ type: 'UPDATE_FORM', payload: { projectId: undefined } });
      return;
    }
    const saved = projects.find((p) => p.id === projectId);
    if (!saved) return;
    dispatch({ type: 'SET_PROJECT', payload: saved.project });
    dispatch({
      type: 'UPDATE_FORM',
      payload: {
        projectId: saved.project.id,
        childId: form.childId || generateChildId(form.name),
        inheritance: form.inheritance || createDefaultInheritance(false),
      },
    });
  }, [projects, dispatch, form.childId, form.name, form.inheritance]);

  const updateSubmissionConfig = (updates: Partial<typeof form.submissionConfig>) => {
    dispatch({ type: 'UPDATE_SUBMISSION_CONFIG', payload: updates });
  };

  const updatePluginSettings = (updates: Partial<typeof form.pluginSettings>) => {
    dispatch({ type: 'UPDATE_PLUGIN_SETTINGS', payload: updates });
  };

  // Analytics enable toggle. When the form inherits analytics from a project,
  // the toggle edits the project defaults so all inheriting forms stay in sync.
  const analyticsEditsProject = !!(currentProject && form.inheritance?.analytics);
  const effectiveAnalytics = analyticsEditsProject
    ? currentProject!.defaults.analytics
    : form.analyticsConfig;
  const analyticsEnabled = !!effectiveAnalytics?.enabled;
  const setAnalyticsEnabled = (enabled: boolean) => {
    if (analyticsEditsProject && currentProject) {
      dispatch({
        type: 'UPDATE_PROJECT_DEFAULTS',
        payload: { analytics: { ...currentProject.defaults.analytics, enabled } },
      });
    } else {
      updateForm({ analyticsConfig: { ...(form.analyticsConfig || { enabled: false }), enabled } });
    }
  };

  return (
    <div className="form-settings">
      <div className="editor-header">
        <h3>Form Settings</h3>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`tab-btn ${activeTab === 'submission' ? 'active' : ''}`}
          onClick={() => setActiveTab('submission')}
        >
          Submission
        </button>
        <button
          className={`tab-btn ${activeTab === 'plugin' ? 'active' : ''}`}
          onClick={() => setActiveTab('plugin')}
        >
          Plugin
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && (
          <div className="settings-section">
            <div className="form-group">
              <label>Form Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="My Form"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="A brief description of your form"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Version</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => updateForm({ version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>

            <div className="form-group">
              <label>Author</label>
              <input
                type="text"
                value={form.author || ''}
                onChange={(e) => updateForm({ author: e.target.value })}
                placeholder="Your name"
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                />
                <span>Enable analytics tracking</span>
              </label>
              <p className="field-hint">
                Collects anonymous, privacy-safe funnel &amp; drop-off data from
                live forms (never answer values). View it in the Analytics dashboard.
                {analyticsEditsProject ? ' Editing the project default (inherited).' : ''}
              </p>
            </div>

            <div className="form-group">
              <label>Project</label>
              <select
                value={form.projectId || ''}
                onChange={(e) => handleAssignProject(e.target.value)}
              >
                <option value="">No project (standalone)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project.name}
                  </option>
                ))}
              </select>
              <p className="field-hint">
                Link this form to a project to share its design system and export
                every project form as a single plugin.
              </p>
            </div>

            {currentProject && (
              <div className="project-inheritance">
                <div className="form-group">
                  <label>Form ID (shortcode)</label>
                  <input
                    type="text"
                    value={form.childId || ''}
                    onChange={(e) =>
                      updateForm({
                        childId: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '_')
                          .replace(/(^_|_$)/g, ''),
                      })
                    }
                    placeholder="contact_form"
                  />
                  <p className="field-hint">
                    Embed with <code>[{currentProject.defaults.plugin.shortcode} id="{form.childId || 'form_id'}"]</code>
                  </p>
                </div>

                <label className="inheritance-title">Inherit from project</label>
                {inheritanceSections.map((section) => (
                  <div className="form-group checkbox-group" key={section.key}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={!!form.inheritance?.[section.key]}
                        onChange={(e) =>
                          dispatch({
                            type: 'UPDATE_FORM_INHERITANCE',
                            payload: { [section.key]: e.target.checked },
                          })
                        }
                      />
                      <span>{section.label}</span>
                    </label>
                    <p className="field-hint">{section.hint}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'submission' && (
          <div className="settings-section">
            <div className="form-group">
              <label>Submission Method</label>
              <select
                value={form.submissionConfig.method}
                onChange={(e) => updateSubmissionConfig({ method: e.target.value as 'POST' | 'GET' })}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>

            <div className="form-group">
              <label>Submission URL</label>
              <input
                type="url"
                value={form.submissionConfig.url}
                onChange={(e) => updateSubmissionConfig({ url: e.target.value })}
                placeholder="https://api.example.com/submit"
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.submissionConfig.appendWPCidParamsToSubmissionUrl ?? true}
                  onChange={(e) =>
                    updateSubmissionConfig({ appendWPCidParamsToSubmissionUrl: e.target.checked })
                  }
                />
                <span>Append WP CID Tracking parameters to custom submission URL</span>
              </label>
              <p className="hint">
                Exported WordPress forms only. When enabled, query params from window.WPCidTracking are appended to the
                configured submission URL if missing.
              </p>
            </div>

            <div className="form-group">
              <label>Headers (JSON)</label>
              <textarea
                value={JSON.stringify(form.submissionConfig.headers, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    updateSubmissionConfig({ headers });
                  } catch {}
                }}
                rows={4}
                className="code-textarea"
              />
            </div>

            <div className="form-group">
              <label>Success Message</label>
              <input
                type="text"
                value={form.submissionConfig.successMessage}
                onChange={(e) => updateSubmissionConfig({ successMessage: e.target.value })}
                placeholder="Thank you for your submission!"
              />
            </div>

            <div className="form-group">
              <label>Error Message</label>
              <input
                type="text"
                value={form.submissionConfig.errorMessage}
                onChange={(e) => updateSubmissionConfig({ errorMessage: e.target.value })}
                placeholder="Something went wrong. Please try again."
              />
            </div>

            <div className="form-group">
              <label>Redirect on Success (optional)</label>
              <input
                type="url"
                value={form.submissionConfig.redirectOnSuccess || ''}
                onChange={(e) => updateSubmissionConfig({ redirectOnSuccess: e.target.value })}
                placeholder="https://example.com/thank-you"
              />
            </div>

            {form.submissionConfig.redirectOnSuccess && (
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.submissionConfig.skipThankYouPage || false}
                    onChange={(e) => updateSubmissionConfig({ skipThankYouPage: e.target.checked })}
                  />
                  <span>Skip thank you page and redirect immediately</span>
                </label>
                <p className="hint">When enabled, users will be redirected without seeing the success message</p>
              </div>
            )}

            <div className="form-group">
              <label>Data Layer Event Name (optional)</label>
              <input
                type="text"
                value={form.submissionConfig.dataLayerEventName || ''}
                onChange={(e) => updateSubmissionConfig({ dataLayerEventName: e.target.value })}
                placeholder="e.g., form_submission"
              />
              <span className="hint">Google Tag Manager event name to fire on successful submission (before redirect)</span>
            </div>

            <h4 style={{ marginTop: '24px', marginBottom: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>Custom Fields</h4>
            <p className="hint" style={{ marginBottom: '12px' }}>Add extra fields to include in the POST body</p>
            
            <div className="custom-fields-container">
              {(form.submissionConfig.customFields || []).length === 0 && (
                <div className="custom-fields-empty">
                  <span className="custom-fields-empty-icon">📋</span>
                  <p>No custom fields added yet</p>
                </div>
              )}
              
              {(form.submissionConfig.customFields || []).map((field, index) => (
                <div key={field.id} className="custom-field-row">
                  <div className="custom-field-inputs">
                    <div className="custom-field-input-group">
                      <label>Key</label>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => {
                          const newFields = [...(form.submissionConfig.customFields || [])];
                          newFields[index] = { ...newFields[index], key: e.target.value };
                          updateSubmissionConfig({ customFields: newFields });
                        }}
                        placeholder="e.g., source"
                      />
                    </div>
                    <div className="custom-field-input-group">
                      <label>Value</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => {
                          const newFields = [...(form.submissionConfig.customFields || [])];
                          newFields[index] = { ...newFields[index], value: e.target.value };
                          updateSubmissionConfig({ customFields: newFields });
                        }}
                        placeholder="e.g., website_form"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newFields = (form.submissionConfig.customFields || []).filter((_, i) => i !== index);
                      updateSubmissionConfig({ customFields: newFields });
                    }}
                    className="custom-field-remove"
                    title="Remove field"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={() => {
                const newField = {
                  id: `custom-field-${Date.now()}`,
                  key: '',
                  value: ''
                };
                updateSubmissionConfig({ 
                  customFields: [...(form.submissionConfig.customFields || []), newField] 
                });
              }}
              className="custom-field-add-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add Custom Field
            </button>

            <h4 style={{ marginTop: '24px', marginBottom: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>Success Screen Design</h4>

            <div className="form-group">
              <label>Success Icon</label>
              <input
                type="text"
                value={form.submissionConfig.successIcon || ''}
                onChange={(e) => updateSubmissionConfig({ successIcon: e.target.value })}
                placeholder="✅"
              />
              <span className="hint">Emoji or text for success screen (e.g., ✅, 🎉, ✓)</span>
            </div>

            <div className="form-group">
              <label>Success Background Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.submissionConfig.successBackgroundColor || '#ffffff'}
                  onChange={(e) => updateSubmissionConfig({ successBackgroundColor: e.target.value })}
                  style={{ width: '50px', height: '36px', padding: '2px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={form.submissionConfig.successBackgroundColor || ''}
                  onChange={(e) => updateSubmissionConfig({ successBackgroundColor: e.target.value })}
                  placeholder="Leave empty for default"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Success Text Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.submissionConfig.successTextColor || '#10B981'}
                  onChange={(e) => updateSubmissionConfig({ successTextColor: e.target.value })}
                  style={{ width: '50px', height: '36px', padding: '2px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={form.submissionConfig.successTextColor || ''}
                  onChange={(e) => updateSubmissionConfig({ successTextColor: e.target.value })}
                  placeholder="Leave empty for default"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <PostSubmissionRulesEditor />
          </div>
        )}

        {activeTab === 'plugin' && (
          <div className="settings-section">
            <div className="form-group">
              <label>Plugin Name</label>
              <input
                type="text"
                value={form.pluginSettings.pluginName}
                onChange={(e) => updatePluginSettings({ pluginName: e.target.value })}
                placeholder="My Custom Form"
              />
            </div>

            <div className="form-group">
              <label>Plugin Slug</label>
              <input
                type="text"
                value={form.pluginSettings.pluginSlug}
                onChange={(e) => updatePluginSettings({ pluginSlug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="my-custom-form"
              />
              <span className="hint">Used for folder and file names</span>
            </div>

            <div className="form-group">
              <label>Plugin Version</label>
              <input
                type="text"
                value={form.pluginSettings.pluginVersion}
                onChange={(e) => updatePluginSettings({ pluginVersion: e.target.value })}
                placeholder="1.0.0"
              />
            </div>

            <div className="form-group">
              <label>Plugin Author</label>
              <input
                type="text"
                value={form.pluginSettings.pluginAuthor}
                onChange={(e) => updatePluginSettings({ pluginAuthor: e.target.value })}
                placeholder="Your Name"
              />
            </div>

            <div className="form-group">
              <label>Plugin Description</label>
              <textarea
                value={form.pluginSettings.pluginDescription}
                onChange={(e) => updatePluginSettings({ pluginDescription: e.target.value })}
                placeholder="A custom form plugin..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Shortcode</label>
              <div className="shortcode-input">
                <span>[</span>
                <input
                  type="text"
                  value={form.pluginSettings.shortcode}
                  onChange={(e) => updatePluginSettings({ shortcode: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="custom_form"
                />
                <span>]</span>
              </div>
              <span className="hint">Use this shortcode to embed the form in your pages</span>
            </div>

            <div className="form-group">
              <label>Admin Menu Location</label>
              <select
                value={form.pluginSettings.menuLocation}
                onChange={(e) => updatePluginSettings({ menuLocation: e.target.value as any })}
              >
                <option value="settings">Under Settings</option>
                <option value="tools">Under Tools</option>
                <option value="toplevel">Top Level Menu</option>
              </select>
            </div>

            {form.pluginSettings.menuLocation === 'toplevel' && (
              <div className="form-group">
                <label>Menu Icon (Dashicons)</label>
                <input
                  type="text"
                  value={form.pluginSettings.menuIcon || ''}
                  onChange={(e) => updatePluginSettings({ menuIcon: e.target.value })}
                  placeholder="dashicons-feedback"
                />
                <span className="hint">
                  See <a href="https://developer.wordpress.org/resource/dashicons/" target="_blank" rel="noopener noreferrer">Dashicons</a>
                </span>
              </div>
            )}

            <h4 style={{ marginTop: '24px', marginBottom: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>Error Monitoring</h4>

            <div className="form-group">
              <label>Sentry DSN (optional)</label>
              <input
                type="text"
                value={form.pluginSettings.sentryDsn || ''}
                onChange={(e) => updatePluginSettings({ sentryDsn: e.target.value })}
                placeholder="https://examplePublicKey@o0.ingest.sentry.io/0"
              />
              <span className="hint">Provide a Sentry DSN to enable error monitoring. Critical errors during form rendering and submission will be reported to Sentry.</span>
            </div>

            <h4 style={{ marginTop: '24px', marginBottom: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>Loading</h4>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.pluginSettings.showSkeleton || false}
                  onChange={(e) => updatePluginSettings({ showSkeleton: e.target.checked })}
                />
                Show skeleton loader on page load
              </label>
              <span className="hint">Displays a placeholder skeleton that mirrors Step 1 while the form JavaScript loads. Prevents layout shift.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
