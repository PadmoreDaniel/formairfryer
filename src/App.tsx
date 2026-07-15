import React, { useState } from 'react';
import { BuilderProvider, useBuilder } from './context/BuilderContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FormBuilder } from './components/FormBuilder';
import { LoginPage } from './components/LoginPage';
import { FormsList } from './components/FormsList';
import { createForm } from './utils/defaults';
import { Form, Project } from './types';
import './styles/main.css';

type AppView = 'login' | 'forms-list' | 'builder';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { loadForm, dispatch } = useBuilder();
  const [currentView, setCurrentView] = useState<AppView>(user ? 'builder' : 'login');
  const [loadedFormId, setLoadedFormId] = useState<string | null>(null);
  // How the builder was entered. Only the initial 'draft' entry should restore
  // the auto-saved localStorage draft; explicit new/loaded entries must not.
  const [builderEntry, setBuilderEntry] = useState<'draft' | 'new' | 'loaded'>('draft');

  // Update view when auth state changes
  React.useEffect(() => {
    if (user && currentView === 'login') {
      setCurrentView('builder');
    }
  }, [user, currentView]);

  const handleLoadForm = (form: Form, firestoreId: string | undefined, project: Project | null) => {
    dispatch({ type: 'SET_PROJECT', payload: project });
    loadForm(form);
    setLoadedFormId(firestoreId || null);
    setBuilderEntry('loaded');
    setCurrentView('builder');
  };

  const handleNewForm = (project: Project | null) => {
    dispatch({ type: 'SET_PROJECT', payload: project });
    if (project) {
      dispatch({ type: 'IMPORT_FORM', payload: createForm({ project }) });
    } else {
      dispatch({ type: 'RESET_FORM' });
    }
    setLoadedFormId(null);
    setBuilderEntry('new');
    setCurrentView('builder');
  };

  const handleGoToFormsList = () => {
    setCurrentView('forms-list');
  };

  const handleGoToBuilder = () => {
    setCurrentView('builder');
  };

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Show forms list
  if (currentView === 'forms-list') {
    return (
      <FormsList
        onLoadForm={handleLoadForm}
        onNewForm={handleNewForm}
        onBack={handleGoToBuilder}
      />
    );
  }

  // Show main builder
  return (
    <FormBuilder 
      onShowFormsList={handleGoToFormsList}
      loadedFormId={loadedFormId}
      restoreDraft={builderEntry === 'draft'}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <BuilderProvider>
        <AppContent />
      </BuilderProvider>
    </AuthProvider>
  );
}

export default App;
