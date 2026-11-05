import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { AuthStage } from './components/AuthStage';
import { Dashboard } from './components/Dashboard';
import { Bike, Loader2, Heart, Shield } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'cadastro'>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-indigo-600/30 animate-pulse">
            <Bike className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin absolute -bottom-2 -right-2" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Carregando SCGE...</p>
        <span className="text-xs text-slate-500 mt-1">Conectando ao sistema de entregas</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-radial-glow text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header authMode={authMode} setAuthMode={setAuthMode} />

      {/* Main Body: Dashboard when authenticated, Auth Stage when not */}
      <div className="flex-1">
        {currentUser ? (
          <Dashboard />
        ) : (
          <AuthStage authMode={authMode} setAuthMode={setAuthMode} />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>SCGE • Sistema de Controle e Gestão de Entregas</span>
          </div>
          <p className="flex items-center gap-1">
            Feito para facilitar a rotina do entregador <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
          </p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
