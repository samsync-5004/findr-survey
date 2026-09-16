import React, { useState, useEffect } from 'react';
import SurveyForm from './components/survey/SurveyForm';
import DashboardLogin from './components/dashboard/DashboardLogin';
import DashboardOverview from './components/dashboard/DashboardOverview';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  const [view, setView] = useState<'survey' | 'dashboard-login' | 'dashboard-overview'>('survey');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('findr_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('findr_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('findr_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const isAdminAuthenticated = currentUser || sessionStorage.getItem('findr_admin_auth') === 'true';

  const handleSwitchToDashboard = () => {
    if (isAdminAuthenticated) {
      setView('dashboard-overview');
    } else {
      setView('dashboard-login');
    }
  };

  const handleLoginSuccess = () => {
    setView('dashboard-overview');
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('findr_admin_auth');
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setView('survey');
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
      {view === 'survey' && (
        <SurveyForm 
          onSwitchToDashboard={handleSwitchToDashboard} 
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      )}

      {view === 'dashboard-login' && (
        <DashboardLogin
          onBackToSurvey={() => setView('survey')}
          onLoginSuccess={handleLoginSuccess}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      )}

      {view === 'dashboard-overview' && (
        <DashboardOverview
          onLogout={handleLogout}
          onBackToSurvey={() => setView('survey')}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}
