import React, { useState } from 'react';
import { BuilderProvider, useBuilder } from './context/BuilderContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FormBuilder } from './components/FormBuilder';
import { LoginPage } from './components/LoginPage';
import { FormsList } from './components/FormsList';
import { Form } from './types';
import './styles/main.css';

type AppView = 'login' | 'forms-list' | 'builder';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { loadForm } = useBuilder();
  const [currentView, setCurrentView] = useState<AppView>(user ? 'builder' : 'login');
  const [loadedFormId, setLoadedFormId] = useState<string | null>(null);

  // Update view when auth state changes
  React.useEffect(() => {
    if (user && currentView === 'login') {
      setCurrentView('builder');
    }
  }, [user, currentView]);

  const handleLoadForm = (form: Form, firestoreId?: string) => {
    loadForm(form);
    setLoadedFormId(firestoreId || null);
    setCurrentView('builder');
  };

  const handleNewForm = () => {
    setLoadedFormId(null);
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
