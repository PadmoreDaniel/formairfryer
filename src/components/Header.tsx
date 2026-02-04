import React from 'react';
import { useBuilder } from '../context/BuilderContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onPreview: () => void;
  onSave: () => void;
  onShowFormsList?: () => void;
  saving?: boolean;
}

export function Header({ onPreview, onSave, onShowFormsList, saving }: HeaderProps) {
  const { state, dispatch } = useBuilder();
  const { user, logout } = useAuth();
  const { form, isDirty, historyIndex, history } = state;

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (canUndo) {
      dispatch({ type: 'UNDO' });
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      dispatch({ type: 'REDO' });
    }
  };

  const handleNewForm = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Create a new form anyway?')) {
        return;
      }
    }
    dispatch({ type: 'RESET_FORM' });
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <img src="/logo.png" alt="FormAirFryer" className="logo-image" />
        </div>
        
        <div className="form-name">
          <input
            type="text"
            value={form.name}
            onChange={(e) => dispatch({ type: 'UPDATE_FORM', payload: { name: e.target.value } })}
            placeholder="Form Name"
            className="form-name-input"
          />
          {isDirty && <span className="unsaved-badge">●</span>}
        </div>
      </div>

      <div className="header-center">
        <div className="history-controls">
          <button
            className="btn-icon"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ←
          </button>
          <button
            className="btn-icon"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            →
          </button>
        </div>
      </div>

      <div className="header-right">
        {onShowFormsList && (
          <button className="btn btn-outline" onClick={onShowFormsList}>
            My Forms
          </button>
        )}
        <button className="btn btn-outline" onClick={handleNewForm}>
          + New Form
        </button>
        <button className="btn btn-outline" onClick={onPreview}>
          Preview
        </button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {user && (
          <div className="user-menu">
            <span className="user-email">{user.email}</span>
            <button className="btn btn-link" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
