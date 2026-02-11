import React, { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';

export function FormSettings() {
  const { state, dispatch } = useBuilder();
  const { form } = state;
  const [activeTab, setActiveTab] = useState<'general' | 'submission' | 'plugin'>('general');

  const updateForm = (updates: Partial<typeof form>) => {
    dispatch({ type: 'UPDATE_FORM', payload: updates });
  };

  const updateSubmissionConfig = (updates: Partial<typeof form.submissionConfig>) => {
    dispatch({ type: 'UPDATE_SUBMISSION_CONFIG', payload: updates });
  };

  const updatePluginSettings = (updates: Partial<typeof form.pluginSettings>) => {
    dispatch({ type: 'UPDATE_PLUGIN_SETTINGS', payload: updates });
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
          </div>
        )}
      </div>
    </div>
  );
}
