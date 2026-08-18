import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getUserForms,
  deleteForm,
  SavedForm,
  getUserProjects,
  saveProject,
  SavedProject,
} from '../services/formService';
import { createProject } from '../utils/defaults';
import { Form, Step, Project } from '../types';

interface FormsListProps {
  onLoadForm: (form: Form, firestoreId: string | undefined, project: Project | null) => void;
  onNewForm: (project: Project | null) => void;
  onBack: () => void;
  onViewAnalytics?: (formId: string) => void;
}

export function FormsList({ onLoadForm, onNewForm, onBack, onViewAnalytics }: FormsListProps) {
  const { user } = useAuth();
  const [forms, setForms] = useState<SavedForm[]>([]);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setForms([]);
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [userForms, userProjects] = await Promise.all([
        getUserForms(user.uid),
        getUserProjects(user.uid),
      ]);
      setForms(userForms);
      setProjects(userProjects);
    } catch (err: any) {
      setError(err.message || 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const projectById = useCallback(
    (id?: string): Project | null => projects.find((p) => p.id === id)?.project || null,
    [projects]
  );

  const handleCreateProject = async () => {
    if (!user || !newProjectName.trim()) return;
    try {
      const project = createProject(newProjectName.trim());
      await saveProject(user.uid, project);
      setNewProjectName('');
      setCreatingProject(false);
      await loadData();
      setSelectedProjectId(project.id);
      // Immediately start a new form inside the freshly created project.
      onNewForm(project);
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
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
    onLoadForm(savedForm.form, savedForm.id, projectById(savedForm.form.projectId));
  };

  const selectedProject = selectedProjectId === 'all' ? null : projectById(selectedProjectId);

  const visibleForms = forms.filter((f) => {
    if (selectedProjectId === 'all') return true;
    if (selectedProjectId === 'none') return !f.form.projectId;
    return f.form.projectId === selectedProjectId;
  });

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
        <button className="btn-new-form" onClick={() => onNewForm(selectedProject)}>
          + New Form
        </button>
      </div>

      <div className="projects-bar">
        <label htmlFor="project-filter">Project:</label>
        <select
          id="project-filter"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="all">All forms</option>
          <option value="none">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project.name}
            </option>
          ))}
        </select>
        {creatingProject ? (
          <span className="project-create">
            <input
              type="text"
              value={newProjectName}
              autoFocus
              placeholder="Project name"
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') setCreatingProject(false);
              }}
            />
            <button className="btn-small" onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Create
            </button>
            <button className="btn-small btn-secondary" onClick={() => setCreatingProject(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button className="btn-small" onClick={() => setCreatingProject(true)}>
            + New Project
          </button>
        )}
      </div>

      {error && <div className="forms-list-error">{error}</div>}

      {loading ? (
        <div className="forms-list-loading">
          <div className="loading-spinner"></div>
          <p>Loading your forms...</p>
        </div>
      ) : visibleForms.length === 0 ? (
        <div className="forms-list-empty">
          <div className="empty-icon">📝</div>
          <h2>No Forms Yet</h2>
          <p>Create your first form to get started</p>
          <button className="btn-create-first" onClick={() => onNewForm(selectedProject)}>
            Create Your First Form
          </button>
        </div>
      ) : (
        <div className="forms-grid">
          {visibleForms.map(savedForm => (
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
                {onViewAnalytics && (
                  <button
                    className="btn-load-form"
                    onClick={() => onViewAnalytics(savedForm.form.id)}
                    title="View analytics"
                  >
                    📊 Analytics
                  </button>
                )}
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
