import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserForms, deleteForm, SavedForm } from '../services/formService';
import { Form, Step } from '../types';

interface FormsListProps {
  onLoadForm: (form: Form, firestoreId?: string) => void;
  onNewForm: () => void;
  onBack: () => void;
}

export function FormsList({ onLoadForm, onNewForm, onBack }: FormsListProps) {
  const { user } = useAuth();
  const [forms, setForms] = useState<SavedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, [user]);

  const loadForms = async () => {
    if (!user) {
      setForms([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userForms = await getUserForms(user.uid);
      setForms(userForms);
    } catch (err: any) {
      setError(err.message || 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (formId: string, formName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${formName}"?`)) {
      return;
    }

    try {
      setDeletingId(formId);
      await deleteForm(formId);
      setForms(forms.filter(f => f.id !== formId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete form');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoad = (savedForm: SavedForm) => {
    onLoadForm(savedForm.form, savedForm.id);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="forms-list-page">
      <div className="forms-list-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <h1>My Forms</h1>
        <button className="btn-new-form" onClick={onNewForm}>
          + New Form
        </button>
      </div>

      {error && <div className="forms-list-error">{error}</div>}

      {loading ? (
        <div className="forms-list-loading">
          <div className="loading-spinner"></div>
          <p>Loading your forms...</p>
        </div>
      ) : forms.length === 0 ? (
        <div className="forms-list-empty">
          <div className="empty-icon">📝</div>
          <h2>No Forms Yet</h2>
          <p>Create your first form to get started</p>
          <button className="btn-create-first" onClick={onNewForm}>
            Create Your First Form
          </button>
        </div>
      ) : (
        <div className="forms-grid">
          {forms.map(savedForm => (
            <div key={savedForm.id} className="form-card">
              <div className="form-card-header">
                <h3>{savedForm.form.name}</h3>
                <span className="form-steps-count">
                  {savedForm.form.steps?.length || 0} steps
                </span>
              </div>

              <div className="form-card-meta">
                <p className="form-date">
                  Updated: {formatDate(savedForm.updatedAt)}
                </p>
                <p className="form-created">
                  Created: {formatDate(savedForm.createdAt)}
                </p>
              </div>

              <div className="form-card-preview">
                {savedForm.form.theme && (
                  <div 
                    className="theme-preview-bar"
                    style={{ 
                      background: `linear-gradient(90deg, ${savedForm.form.theme.colors.primary}, ${savedForm.form.theme.colors.secondary || savedForm.form.theme.colors.primary})` 
                    }}
                  />
                )}
                <div className="steps-preview">
                  {savedForm.form.steps?.slice(0, 3).map((step: Step, idx: number) => (
                    <span key={idx} className="step-preview-item">
                      {step.title || `Step ${idx + 1}`}
                    </span>
                  ))}
                  {(savedForm.form.steps?.length || 0) > 3 && (
                    <span className="step-preview-more">
                      +{(savedForm.form.steps?.length || 0) - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="form-card-actions">
                <button 
                  className="btn-load-form"
                  onClick={() => handleLoad(savedForm)}
                >
                  Edit Form
                </button>
                <button
                  className="btn-delete-form"
                  onClick={() => handleDelete(savedForm.id!, savedForm.form.name)}
                  disabled={deletingId === savedForm.id}
                >
                  {deletingId === savedForm.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FormsList;
