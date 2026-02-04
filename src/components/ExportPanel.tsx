import React, { useRef, useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { downloadFormJSON, downloadWordPressPlugin, importFormFromJSON } from '../utils/exportUtils';
import { AIFormGenerator } from './AIFormGenerator';
import { formTemplates, FormTemplate } from '../utils/formTemplates';

export function ExportPanel() {
  const { state, dispatch, loadForm } = useBuilder();
  const { form } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleExportJSON = () => {
    try {
      downloadFormJSON(form);
      setExportStatus('JSON exported successfully!');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      setExportStatus('Failed to export JSON');
    }
  };

  const handleExportPlugin = async () => {
    setIsExporting(true);
    setExportStatus('Generating WordPress plugin...');
    
    try {
      await downloadWordPressPlugin(form);
      setExportStatus('WordPress plugin exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('Failed to export plugin. Please try again.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(null), 5000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const importedForm = importFormFromJSON(jsonString);
        
        if (importedForm) {
          dispatch({ type: 'IMPORT_FORM', payload: importedForm });
          setExportStatus('Form imported successfully!');
        } else {
          setExportStatus('Invalid form file');
        }
      } catch (error) {
        setExportStatus('Failed to import form');
      }
      
      setTimeout(() => setExportStatus(null), 3000);
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  };

  const handleCopyJSON = async () => {
    try {
      const json = JSON.stringify(form, null, 2);
      await navigator.clipboard.writeText(json);
      setExportStatus('JSON copied to clipboard!');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      setExportStatus('Failed to copy to clipboard');
    }
  };

  const handleLoadTemplate = (template: FormTemplate) => {
    if (state.isDirty) {
      if (!window.confirm('You have unsaved changes. Load template anyway?')) {
        return;
      }
    }
    const generatedForm = template.generate();
    loadForm(generatedForm);
    setShowTemplates(false);
    setExportStatus(`Template "${template.name}" loaded!`);
    setTimeout(() => setExportStatus(null), 3000);
  };

  return (
    <div className="export-panel">
      <div className="editor-header">
        <h3>Export & Import</h3>
      </div>

      <div className="export-section">
        <h4>Import</h4>
        <p className="export-description">
          Import a previously exported form configuration or generate one with AI.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div className="export-buttons">
          <button className="btn-export" onClick={handleImportClick}>
            📥 Import JSON
          </button>
          <button className="btn-export btn-template" onClick={() => setShowTemplates(!showTemplates)}>
            📋 Templates
          </button>
          <button className="btn-export btn-ai" onClick={() => setShowAIGenerator(true)}>
            ✨ AI Generate
          </button>
        </div>

        {showTemplates && (
          <div className="templates-dropdown">
            <h5>Choose a Template</h5>
            <div className="templates-list">
              {formTemplates.map((template) => (
                <button
                  key={template.id}
                  className="template-item"
                  onClick={() => handleLoadTemplate(template)}
                >
                  <span className="template-icon">{template.icon}</span>
                  <div className="template-info">
                    <span className="template-name">{template.name}</span>
                    <span className="template-description">{template.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AIFormGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
      />

      <div className="export-section">
        <h4>Export as JSON</h4>
        <p className="export-description">
          Export your form configuration as a JSON file. This can be used to backup your form or import it later.
        </p>
        <div className="export-buttons">
          <button className="btn-export" onClick={handleExportJSON}>
            💾 Download JSON
          </button>
          <button className="btn-export btn-secondary" onClick={handleCopyJSON}>
            📋 Copy to Clipboard
          </button>
        </div>
      </div>

      <div className="export-section">
        <h4>Export as WordPress Plugin</h4>
        <p className="export-description">
          Generate a complete WordPress plugin with all necessary files. The plugin will include:
        </p>
        <ul className="export-features">
          <li>✅ Main plugin PHP file</li>
          <li>✅ Form templates</li>
          <li>✅ Custom CSS styles</li>
          <li>✅ JavaScript form handler</li>
          <li>✅ AJAX submission handling</li>
          <li>✅ Shortcode support</li>
          <li>✅ Admin settings page</li>
        </ul>
        <button
          className="btn-export btn-primary"
          onClick={handleExportPlugin}
          disabled={isExporting}
        >
          {isExporting ? '⏳ Generating...' : '🚀 Download WordPress Plugin'}
        </button>
      </div>

      <div className="export-section">
        <h4>Plugin Details</h4>
        <div className="plugin-preview">
          <div className="preview-row">
            <span className="preview-label">Plugin Name:</span>
            <span className="preview-value">{form.pluginSettings.pluginName}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Slug:</span>
            <span className="preview-value">{form.pluginSettings.pluginSlug}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Version:</span>
            <span className="preview-value">{form.pluginSettings.pluginVersion}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Shortcode:</span>
            <code className="preview-value">[{form.pluginSettings.shortcode}]</code>
          </div>
        </div>
      </div>

      {exportStatus && (
        <div className={`export-status ${exportStatus.includes('Failed') || exportStatus.includes('Invalid') ? 'error' : 'success'}`}>
          {exportStatus}
        </div>
      )}
    </div>
  );
}
