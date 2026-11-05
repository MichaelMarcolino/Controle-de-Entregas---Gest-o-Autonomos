import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bike, ShieldCheck, User, Download } from 'lucide-react';

interface HeaderProps {
  authMode?: 'login' | 'cadastro';
  setAuthMode?: (mode: 'login' | 'cadastro') => void;
}

export const Header: React.FC<HeaderProps> = ({ authMode, setAuthMode }) => {
  const { currentUser, logout } = useAuth();

  const handleSair = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-indigo-900/40 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        
        {/* LOGO & TITLE */}
        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Controle de Entregas
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                  SCGE
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden xs:block">
                Painel do Entregador & Gestão Financeira
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div className="logo">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                Um portal de soluções
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Aqui você, anota, cria e gerencia
              </p>
            </div>
          </div>
        )}

        {/* ACTIONS / NAVIGATION */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botão Baixar Projeto ZIP */}
          <a
            href="/scge-projeto.zip"
            download="scge-projeto.zip"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-bold transition shadow-sm hover:border-cyan-400/50"
            title="Baixar arquivos prontos (.ZIP) para substituir na sua pasta"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Baixar Pasta (.ZIP)</span>
            <span className="sm:hidden">.ZIP</span>
          </a>

          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="max-w-[150px] truncate font-medium">{currentUser.email || currentUser.displayName}</span>
                {currentUser.isGuest && (
                  <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                    Demo
                  </span>
                )}
              </div>

              {/* Botão Sair com id e classe originais */}
              <button 
                id="btn-sair"
                onClick={handleSair}
                className="botao-sair flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs sm:text-sm tracking-wider uppercase transition shadow-md shadow-rose-900/30 active:scale-95 cursor-pointer border border-rose-500/30"
                title="Sair e voltar ao início"
              >
                <LogOut className="w-4 h-4" />
                <span>SAIR</span>
              </button>
            </div>
          ) : (
            <div className="nav-buttons flex items-center gap-2 sm:gap-3">
              <button 
                id="btn-login"
                onClick={() => setAuthMode && setAuthMode('login')}
                className={`btn-nav px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                Login
              </button>
              <button 
                id="btn-cadastro"
                onClick={() => setAuthMode && setAuthMode('cadastro')}
                className={`btn-nav px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition cursor-pointer ${
                  authMode === 'cadastro'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                Cadastre-se
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
