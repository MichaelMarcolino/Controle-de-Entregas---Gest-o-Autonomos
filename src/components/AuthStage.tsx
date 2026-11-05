import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, KeyRound, Mail, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthStageProps {
  authMode: 'login' | 'cadastro';
  setAuthMode: (mode: 'login' | 'cadastro') => void;
}

export const AuthStage: React.FC<AuthStageProps> = ({ authMode, setAuthMode }) => {
  const { login, register, resetPassword, guestLogin } = useAuth();

  const [currentView, setCurrentView] = useState<'login' | 'cadastro' | 'recuperar'>(authMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync with prop when changed from header
  React.useEffect(() => {
    setCurrentView(authMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [authMode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setErrorMsg(result.error || 'Erro ao entrar. Verifique seus dados.');
    }
  };

  const handleCadastroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 dígitos.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await register(email, password);
    setLoading(false);
    if (!result.success) {
      setErrorMsg(result.error || 'Erro ao criar conta.');
    }
  };

  const handleRecuperarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Digite o e-mail cadastrado para redefinir.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await resetPassword(email);
    setLoading(false);
    if (result.success) {
      setSuccessMsg(result.message || 'Link de recuperação enviado com sucesso!');
    } else {
      setErrorMsg(result.error || 'Erro ao enviar e-mail de recuperação.');
    }
  };

  return (
    <main className="main-stage max-w-6xl mx-auto px-4 py-8 sm:py-16 min-h-[calc(100vh-80px)] flex flex-col justify-center items-center">
      
      {/* Container Grid with Left Stage, Center Auth, Right Stage */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* LADO ESQUERDO: Card Anote */}
        <div className="stage-side hidden lg:flex lg:col-span-3 justify-center">
          <div className="visual-card floating-anim bg-slate-900/70 border border-purple-500/30 p-6 rounded-2xl shadow-xl shadow-purple-950/40 backdrop-blur-sm flex flex-col items-center text-center transform hover:scale-105 transition duration-300">
            <div 
              className="icon-placeholder w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-inner"
              style={{ backgroundColor: '#c8a2c8' }}
            >
              <span className="emoji-icon">📝</span>
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-wide">Anote!</h3>
            <p className="text-xs text-slate-400 mt-2">
              Registre cada corrida em segundos direto do celular.
            </p>
          </div>
        </div>

        {/* CENTRO: Formulários de Autenticação */}
        <div className="stage-center col-span-1 lg:col-span-6 w-full max-w-md mx-auto">
          <div className="auth-card relative bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 backdrop-blur-md">
            
            {/* Top decorative glow */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-indigo-500/20 blur-2xl pointer-events-none rounded-full"></div>

            {/* Error or Success notification */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* View 1: LOGIN */}
            {currentView === 'login' && (
              <div id="form-login" className="space-y-5">
                <div className="text-center">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Entrar no Sistema
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Acesse seu painel diário de entregas e taxas
                  </p>
                </div>

                <form id="login-form" onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                      Senha
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha de acesso"
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      id="btn-esqueci-senha"
                      onClick={() => {
                        setCurrentView('recuperar');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="link-esqueci text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  <button
                    type="submit"
                    id="btn-entrar"
                    disabled={loading}
                    className="btn-submit w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Acessando...</span>
                      </>
                    ) : (
                      <span>Acessar</span>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    Ainda não possui conta?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('cadastro');
                        setAuthMode('cadastro');
                        setErrorMsg(null);
                      }}
                      className="text-cyan-400 font-bold hover:underline cursor-pointer"
                    >
                      Cadastre-se aqui
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* View 2: CADASTRO */}
            {currentView === 'cadastro' && (
              <div id="form-cadastro" className="space-y-5">
                <div className="text-center">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Criar Conta
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Cadastre-se para gerenciar suas rotas e lucros
                  </p>
                </div>

                <form id="cadastro-form" onSubmit={handleCadastroSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        id="email-cadastro"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                      Senha (mínimo 6 dígitos)
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password-cadastro"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-criar-conta"
                    disabled={loading}
                    className="btn-submit w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Criando conta...</span>
                      </>
                    ) : (
                      <span>Cadastrar</span>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    Já possui conta?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('login');
                        setAuthMode('login');
                        setErrorMsg(null);
                      }}
                      className="text-indigo-400 font-bold hover:underline cursor-pointer"
                    >
                      Acesse com seu login
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* View 3: RECUPERAÇÃO DE SENHA */}
            {currentView === 'recuperar' && (
              <div id="form-recuperar" className="space-y-5">
                <div className="text-center">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Recuperar Senha
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Enviaremos um link de redefinição para o seu e-mail
                  </p>
                </div>

                <form id="recuperar-form" onSubmit={handleRecuperarSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                      E-mail cadastrado
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        id="email-recuperar"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-enviar-recuperacao"
                    disabled={loading}
                    className="btn-submit w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando link...</span>
                      </>
                    ) : (
                      <span>Enviar Link</span>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      id="btn-voltar-login"
                      onClick={() => {
                        setCurrentView('login');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="link-esqueci text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Voltar para o Login
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Quick Demo Access Button */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={guestLogin}
                className="w-full py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-400/50 rounded-xl text-xs text-indigo-200 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Testar agora sem cadastro (Modo Convidado)</span>
              </button>
            </div>

          </div>
        </div>

        {/* LADO DIREITO: Card Gerencie */}
        <div className="stage-side hidden lg:flex lg:col-span-3 justify-center">
          <div className="visual-card floating-anim bg-slate-900/70 border border-blue-500/30 p-6 rounded-2xl shadow-xl shadow-blue-950/40 backdrop-blur-sm flex flex-col items-center text-center transform hover:scale-105 transition duration-300" style={{ animationDelay: '1.5s' }}>
            <div 
              className="icon-placeholder w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-inner"
              style={{ backgroundColor: '#93c5fd' }}
            >
              <span className="emoji-icon">☁️</span>
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-wide">Gerencie & Controle</h3>
            <p className="text-xs text-slate-400 mt-2">
              Saldo em tempo real, total de gasolina e cálculo de lucro líquido.
            </p>
          </div>
        </div>

      </div>

    </main>
  );
};
