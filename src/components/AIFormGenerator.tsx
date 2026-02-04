import React, { useState, useCallback } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { generateFormWithAI, getExamplePrompts, isOpenAIConfigured } from '../utils/aiFormGenerator';

interface AIFormGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIFormGenerator({ isOpen, onClose }: AIFormGeneratorProps) {
  const { dispatch } = useBuilder();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const examplePrompts = getExamplePrompts();
  const apiConfigured = isOpenAIConfigured();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please describe the form you want to create');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const form = await generateFormWithAI(prompt);
      dispatch({ type: 'IMPORT_FORM', payload: form });
      onClose();
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate form. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, dispatch, onClose]);

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && !isGenerating) {
      handleGenerate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title">
            <span className="ai-icon">✨</span>
            <h2>AI Form Generator</h2>
          </div>
          <button className="ai-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="ai-modal-body">
          {!apiConfigured && (
            <div className="ai-warning">
              <span className="ai-warning-icon">⚠️</span>
              <div>
                <strong>OpenAI API key not configured</strong>
                <p>Add <code>REACT_APP_OPENAI_API_KEY</code> to your .env file to enable AI generation.</p>
              </div>
            </div>
          )}

          <div className="ai-prompt-section">
            <label htmlFor="ai-prompt" className="ai-label">
              Describe the form you want to create
            </label>
            <textarea
              id="ai-prompt"
              className="ai-prompt-input"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Create a contact form with name, email, phone, and a message field..."
              rows={4}
              disabled={isGenerating || !apiConfigured}
              autoFocus
            />
            <p className="ai-hint">
              Tip: Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to generate
            </p>
          </div>

          <div className="ai-examples-section">
            <label className="ai-label">Or try an example:</label>
            <div className="ai-examples-grid">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  className="ai-example-chip"
                  onClick={() => handleExampleClick(example)}
                  disabled={isGenerating || !apiConfigured}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="ai-error">
              <span className="ai-error-icon">⚠️</span>
              {error}
            </div>
          )}
        </div>

        <div className="ai-modal-footer">
          <button
            className="ai-btn ai-btn-secondary"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            className="ai-btn ai-btn-primary"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || !apiConfigured}
          >
            {isGenerating ? (
              <>
                <span className="ai-spinner"></span>
                Generating...
              </>
            ) : (
              <>
                <span>✨</span>
                Generate Form
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIFormGenerator;
