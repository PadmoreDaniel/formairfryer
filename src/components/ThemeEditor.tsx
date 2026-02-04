import React, { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { Theme, ThemeColors, ThemeTypography, ThemeSpacing, ThemeBorders, ThemeButtons, ThemeInputs, ThemeProgressBar } from '../types';
import { defaultTheme, generateId } from '../utils/defaults';

type TabType = 'colors' | 'typography' | 'spacing' | 'borders' | 'buttons' | 'inputs' | 'progressBar' | 'custom';

export function ThemeEditor() {
  const { state, dispatch } = useBuilder();
  const { theme } = state.form;
  const [activeTab, setActiveTab] = useState<TabType>('colors');

  const updateTheme = (updates: Partial<Theme>) => {
    dispatch({ type: 'UPDATE_THEME', payload: updates });
  };

  const updateColors = (updates: Partial<ThemeColors>) => {
    updateTheme({ colors: { ...theme.colors, ...updates } });
  };

  const updateTypography = (updates: Partial<ThemeTypography>) => {
    updateTheme({ typography: { ...theme.typography, ...updates } });
  };

  const updateSpacing = (updates: Partial<ThemeSpacing>) => {
    updateTheme({ spacing: { ...theme.spacing, ...updates } });
  };

  const updateBorders = (updates: Partial<ThemeBorders>) => {
    updateTheme({ borders: { ...theme.borders, ...updates } });
  };

  const updateButtons = (updates: Partial<ThemeButtons>) => {
    updateTheme({ buttons: { ...theme.buttons, ...updates } });
  };

  const updateInputs = (updates: Partial<ThemeInputs>) => {
    updateTheme({ inputs: { ...theme.inputs, ...updates } });
  };

  const updateProgressBar = (updates: Partial<ThemeProgressBar>) => {
    updateTheme({ progressBar: { ...theme.progressBar, ...updates } });
  };

  const resetTheme = () => {
    if (window.confirm('Reset theme to defaults?')) {
      dispatch({ type: 'SET_THEME', payload: { ...defaultTheme, id: generateId() } });
    }
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'colors', label: 'Colors', icon: '◐' },
    { id: 'typography', label: 'Typography', icon: 'Aa' },
    { id: 'spacing', label: 'Spacing', icon: '⊡' },
    { id: 'borders', label: 'Borders', icon: '▢' },
    { id: 'buttons', label: 'Buttons', icon: '⬚' },
    { id: 'inputs', label: 'Inputs', icon: '▭' },
    { id: 'progressBar', label: 'Progress', icon: '▬' },
    { id: 'custom', label: 'Custom CSS', icon: '</>' },
  ];

  return (
    <div className="theme-editor">
      <div className="editor-header">
        <h3>Theme Editor</h3>
        <button className="btn-reset" onClick={resetTheme}>
          Reset to Default
        </button>
      </div>

      <div className="form-group">
        <label>Theme Name</label>
        <input
          type="text"
          value={theme.name}
          onChange={(e) => updateTheme({ name: e.target.value })}
        />
      </div>

      <div className="theme-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="theme-tab-content">
        {activeTab === 'colors' && (
          <ColorsEditor colors={theme.colors} onChange={updateColors} />
        )}
        {activeTab === 'typography' && (
          <TypographyEditor typography={theme.typography} onChange={updateTypography} />
        )}
        {activeTab === 'spacing' && (
          <SpacingEditor spacing={theme.spacing} onChange={updateSpacing} />
        )}
        {activeTab === 'borders' && (
          <BordersEditor borders={theme.borders} onChange={updateBorders} />
        )}
        {activeTab === 'buttons' && (
          <ButtonsEditor buttons={theme.buttons} onChange={updateButtons} />
        )}
        {activeTab === 'inputs' && (
          <InputsEditor inputs={theme.inputs} onChange={updateInputs} />
        )}
        {activeTab === 'progressBar' && (
          <ProgressBarThemeEditor progressBar={theme.progressBar} onChange={updateProgressBar} />
        )}
        {activeTab === 'custom' && (
          <CustomCSSEditor customCSS={theme.customCSS} onChange={(css) => updateTheme({ customCSS: css })} />
        )}
      </div>

      {/* Live Theme Preview */}
      <ThemePreview theme={theme} />
    </div>
  );
}

// Theme Preview Panel
function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div className="theme-preview-panel">
      <div className="theme-preview-header">Live Preview</div>
      <div 
        className="theme-preview-content"
        style={{
          backgroundColor: theme.colors.background,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.baseFontSize,
          color: theme.colors.text,
          padding: theme.spacing.formPadding,
        }}
      >
        {/* Progress Bar Preview */}
        <div 
          className="theme-preview-progress"
          style={{
            height: theme.progressBar.height,
            backgroundColor: theme.progressBar.backgroundColor,
            borderRadius: theme.progressBar.borderRadius,
            marginBottom: theme.spacing.sectionGap / 2,
          }}
        >
          <div 
            className="theme-preview-progress-fill"
            style={{
              width: '40%',
              height: '100%',
              backgroundColor: theme.progressBar.fillColor,
              borderRadius: theme.progressBar.borderRadius,
              transition: `width 0.3s ${theme.progressBar.animationType}`,
            }}
          />
        </div>

        {/* Title Preview */}
        <div 
          className="theme-preview-title"
          style={{
            fontFamily: theme.typography.headingFontFamily,
            fontSize: theme.typography.baseFontSize * theme.typography.headingScale,
            color: theme.colors.text,
            marginBottom: theme.spacing.unit,
          }}
        >
          Sample Question
        </div>

        {/* Input Preview */}
        <input
          className="theme-preview-input"
          type="text"
          placeholder="Enter your answer..."
          style={{
            width: '100%',
            padding: `${theme.inputs.paddingY}px ${theme.inputs.paddingX}px`,
            fontSize: theme.inputs.fontSize,
            fontFamily: theme.typography.fontFamily,
            border: `${theme.borders.width}px ${theme.borders.style} ${theme.colors.border}`,
            borderRadius: theme.inputs.borderRadius,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            marginBottom: theme.spacing.questionGap,
          }}
          readOnly
        />

        {/* Options Preview */}
        <div 
          className="theme-preview-options"
          style={{ 
            display: 'flex', 
            gap: theme.spacing.unit,
            marginBottom: theme.spacing.sectionGap / 2,
          }}
        >
          <div
            className="theme-preview-option"
            style={{
              flex: 1,
              padding: theme.inputs.paddingY,
              border: `${theme.borders.width}px ${theme.borders.style} ${theme.colors.primary}`,
              borderRadius: theme.inputs.borderRadius,
              backgroundColor: `${theme.colors.primary}15`,
              color: theme.colors.text,
              textAlign: 'center',
            }}
          >
            Option A
          </div>
          <div
            className="theme-preview-option"
            style={{
              flex: 1,
              padding: theme.inputs.paddingY,
              border: `${theme.borders.width}px ${theme.borders.style} ${theme.colors.border}`,
              borderRadius: theme.inputs.borderRadius,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textMuted,
              textAlign: 'center',
            }}
          >
            Option B
          </div>
        </div>

        {/* Button Preview */}
        <div 
          className="theme-preview-buttons"
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <button
            className="theme-preview-btn"
            style={{
              padding: `${theme.buttons.paddingY}px ${theme.buttons.paddingX}px`,
              fontSize: theme.buttons.fontSize,
              fontWeight: theme.buttons.fontWeight,
              textTransform: theme.buttons.textTransform as any,
              borderRadius: theme.buttons.borderRadius,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              border: `${theme.borders.width}px ${theme.borders.style} ${theme.colors.border}`,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
          <button
            className="theme-preview-btn"
            style={{
              padding: `${theme.buttons.paddingY}px ${theme.buttons.paddingX}px`,
              fontSize: theme.buttons.fontSize,
              fontWeight: theme.buttons.fontWeight,
              textTransform: theme.buttons.textTransform as any,
              borderRadius: theme.buttons.borderRadius,
              backgroundColor: theme.colors.primary,
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// Color Editor
function ColorsEditor({
  colors,
  onChange,
}: {
  colors: ThemeColors;
  onChange: (updates: Partial<ThemeColors>) => void;
}) {
  const colorFields: { key: keyof ThemeColors; label: string }[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' },
    { key: 'success', label: 'Success' },
    { key: 'warning', label: 'Warning' },
    { key: 'error', label: 'Error' },
    { key: 'background', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'text', label: 'Text' },
    { key: 'textMuted', label: 'Text Muted' },
    { key: 'border', label: 'Border' },
  ];

  return (
    <div className="colors-editor">
      <div className="color-grid">
        {colorFields.map((field) => (
          <div key={field.key} className="color-field">
            <label>{field.label}</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={colors[field.key]}
                onChange={(e) => onChange({ [field.key]: e.target.value })}
              />
              <input
                type="text"
                value={colors[field.key]}
                onChange={(e) => onChange({ [field.key]: e.target.value })}
                placeholder="#000000"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Typography Editor
function TypographyEditor({
  typography,
  onChange,
}: {
  typography: ThemeTypography;
  onChange: (updates: Partial<ThemeTypography>) => void;
}) {
  const fontFamilies = [
    { value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', label: 'System' },
    { value: '"Inter", sans-serif', label: 'Inter' },
    { value: '"Roboto", sans-serif', label: 'Roboto' },
    { value: '"Open Sans", sans-serif', label: 'Open Sans' },
    { value: '"Lato", sans-serif', label: 'Lato' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: '"Playfair Display", serif', label: 'Playfair Display' },
    { value: '"Fira Code", monospace', label: 'Fira Code' },
  ];

  return (
    <div className="typography-editor">
      <div className="form-group">
        <label>Body Font Family</label>
        <select
          value={typography.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          {fontFamilies.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Heading Font Family</label>
        <select
          value={typography.headingFontFamily}
          onChange={(e) => onChange({ headingFontFamily: e.target.value })}
        >
          {fontFamilies.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Base Font Size (px)</label>
          <input
            type="number"
            value={typography.baseFontSize}
            onChange={(e) => onChange({ baseFontSize: parseInt(e.target.value) || 16 })}
            min={10}
            max={24}
          />
        </div>
        <div className="form-group">
          <label>Heading Scale</label>
          <input
            type="number"
            value={typography.headingScale}
            onChange={(e) => onChange({ headingScale: parseFloat(e.target.value) || 1.25 })}
            min={1}
            max={2}
            step={0.05}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Line Height</label>
        <input
          type="number"
          value={typography.lineHeight}
          onChange={(e) => onChange({ lineHeight: parseFloat(e.target.value) || 1.5 })}
          min={1}
          max={2.5}
          step={0.1}
        />
      </div>
    </div>
  );
}

// Spacing Editor
function SpacingEditor({
  spacing,
  onChange,
}: {
  spacing: ThemeSpacing;
  onChange: (updates: Partial<ThemeSpacing>) => void;
}) {
  return (
    <div className="spacing-editor">
      <div className="form-group">
        <label>Base Unit (px)</label>
        <input
          type="number"
          value={spacing.unit}
          onChange={(e) => onChange({ unit: parseInt(e.target.value) || 8 })}
          min={2}
          max={16}
        />
      </div>

      <div className="form-group">
        <label>Form Padding (px)</label>
        <input
          type="number"
          value={spacing.formPadding}
          onChange={(e) => onChange({ formPadding: parseInt(e.target.value) || 24 })}
          min={0}
          max={64}
        />
      </div>

      <div className="form-group">
        <label>Question Gap (px)</label>
        <input
          type="number"
          value={spacing.questionGap}
          onChange={(e) => onChange({ questionGap: parseInt(e.target.value) || 16 })}
          min={0}
          max={48}
        />
      </div>

      <div className="form-group">
        <label>Section Gap (px)</label>
        <input
          type="number"
          value={spacing.sectionGap}
          onChange={(e) => onChange({ sectionGap: parseInt(e.target.value) || 32 })}
          min={0}
          max={64}
        />
      </div>
    </div>
  );
}

// Borders Editor
function BordersEditor({
  borders,
  onChange,
}: {
  borders: ThemeBorders;
  onChange: (updates: Partial<ThemeBorders>) => void;
}) {
  return (
    <div className="borders-editor">
      <div className="form-group">
        <label>Border Radius (px)</label>
        <input
          type="number"
          value={borders.radius}
          onChange={(e) => onChange({ radius: parseInt(e.target.value) || 8 })}
          min={0}
          max={32}
        />
      </div>

      <div className="form-group">
        <label>Border Width (px)</label>
        <input
          type="number"
          value={borders.width}
          onChange={(e) => onChange({ width: parseInt(e.target.value) || 1 })}
          min={0}
          max={4}
        />
      </div>

      <div className="form-group">
        <label>Border Style</label>
        <select
          value={borders.style}
          onChange={(e) => onChange({ style: e.target.value as 'solid' | 'dashed' | 'dotted' })}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
    </div>
  );
}

// Buttons Editor
function ButtonsEditor({
  buttons,
  onChange,
}: {
  buttons: ThemeButtons;
  onChange: (updates: Partial<ThemeButtons>) => void;
}) {
  return (
    <div className="buttons-editor">
      <div className="form-row">
        <div className="form-group">
          <label>Border Radius (px)</label>
          <input
            type="number"
            value={buttons.borderRadius}
            onChange={(e) => onChange({ borderRadius: parseInt(e.target.value) || 8 })}
            min={0}
            max={32}
          />
        </div>
        <div className="form-group">
          <label>Font Size (px)</label>
          <input
            type="number"
            value={buttons.fontSize}
            onChange={(e) => onChange({ fontSize: parseInt(e.target.value) || 16 })}
            min={10}
            max={24}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Padding X (px)</label>
          <input
            type="number"
            value={buttons.paddingX}
            onChange={(e) => onChange({ paddingX: parseInt(e.target.value) || 24 })}
            min={4}
            max={48}
          />
        </div>
        <div className="form-group">
          <label>Padding Y (px)</label>
          <input
            type="number"
            value={buttons.paddingY}
            onChange={(e) => onChange({ paddingY: parseInt(e.target.value) || 12 })}
            min={4}
            max={32}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Font Weight</label>
          <select
            value={buttons.fontWeight}
            onChange={(e) => onChange({ fontWeight: parseInt(e.target.value) })}
          >
            <option value={400}>Normal (400)</option>
            <option value={500}>Medium (500)</option>
            <option value={600}>Semi-Bold (600)</option>
            <option value={700}>Bold (700)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Text Transform</label>
          <select
            value={buttons.textTransform}
            onChange={(e) => onChange({ textTransform: e.target.value as any })}
          >
            <option value="none">None</option>
            <option value="uppercase">Uppercase</option>
            <option value="capitalize">Capitalize</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Inputs Editor
function InputsEditor({
  inputs,
  onChange,
}: {
  inputs: ThemeInputs;
  onChange: (updates: Partial<ThemeInputs>) => void;
}) {
  return (
    <div className="inputs-editor">
      <div className="form-row">
        <div className="form-group">
          <label>Border Radius (px)</label>
          <input
            type="number"
            value={inputs.borderRadius}
            onChange={(e) => onChange({ borderRadius: parseInt(e.target.value) || 6 })}
            min={0}
            max={32}
          />
        </div>
        <div className="form-group">
          <label>Font Size (px)</label>
          <input
            type="number"
            value={inputs.fontSize}
            onChange={(e) => onChange({ fontSize: parseInt(e.target.value) || 16 })}
            min={10}
            max={24}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Padding X (px)</label>
          <input
            type="number"
            value={inputs.paddingX}
            onChange={(e) => onChange({ paddingX: parseInt(e.target.value) || 12 })}
            min={4}
            max={32}
          />
        </div>
        <div className="form-group">
          <label>Padding Y (px)</label>
          <input
            type="number"
            value={inputs.paddingY}
            onChange={(e) => onChange({ paddingY: parseInt(e.target.value) || 10 })}
            min={4}
            max={24}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Focus Ring Width (px)</label>
          <input
            type="number"
            value={inputs.focusRingWidth}
            onChange={(e) => onChange({ focusRingWidth: parseInt(e.target.value) || 2 })}
            min={0}
            max={6}
          />
        </div>
        <div className="form-group">
          <label>Focus Ring Color</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={inputs.focusRingColor}
              onChange={(e) => onChange({ focusRingColor: e.target.value })}
            />
            <input
              type="text"
              value={inputs.focusRingColor}
              onChange={(e) => onChange({ focusRingColor: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress Bar Theme Editor
function ProgressBarThemeEditor({
  progressBar,
  onChange,
}: {
  progressBar: ThemeProgressBar;
  onChange: (updates: Partial<ThemeProgressBar>) => void;
}) {
  return (
    <div className="progress-bar-theme-editor">
      <div className="form-row">
        <div className="form-group">
          <label>Height (px)</label>
          <input
            type="number"
            value={progressBar.height}
            onChange={(e) => onChange({ height: parseInt(e.target.value) || 8 })}
            min={2}
            max={24}
          />
        </div>
        <div className="form-group">
          <label>Border Radius (px)</label>
          <input
            type="number"
            value={progressBar.borderRadius}
            onChange={(e) => onChange({ borderRadius: parseInt(e.target.value) || 4 })}
            min={0}
            max={16}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Background Color</label>
        <div className="color-input-wrapper">
          <input
            type="color"
            value={progressBar.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
          />
          <input
            type="text"
            value={progressBar.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Fill Color</label>
        <div className="color-input-wrapper">
          <input
            type="color"
            value={progressBar.fillColor}
            onChange={(e) => onChange({ fillColor: e.target.value })}
          />
          <input
            type="text"
            value={progressBar.fillColor}
            onChange={(e) => onChange({ fillColor: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Animation Type</label>
        <select
          value={progressBar.animationType}
          onChange={(e) => onChange({ animationType: e.target.value as any })}
        >
          <option value="ease">Ease</option>
          <option value="linear">Linear</option>
          <option value="ease-in-out">Ease In-Out</option>
          <option value="bounce">Bounce</option>
        </select>
      </div>
    </div>
  );
}

// Custom CSS Editor
function CustomCSSEditor({
  customCSS,
  onChange,
}: {
  customCSS?: string;
  onChange: (css: string) => void;
}) {
  return (
    <div className="custom-css-editor">
      <p className="css-help">
        Add custom CSS to override default styles. Use <code>.wp-form</code> as the root selector.
      </p>
      <textarea
        value={customCSS || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`.wp-form {\n  /* Your custom styles */\n}\n\n.wp-form .question-field {\n  /* Style individual questions */\n}`}
        rows={15}
        className="css-textarea"
      />
    </div>
  );
}
