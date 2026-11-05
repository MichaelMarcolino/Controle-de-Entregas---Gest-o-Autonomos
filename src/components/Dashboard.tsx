import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Rota, 
  Gasto, 
  FormaPagamento, 
  CategoriaGasto 
} from '../types';
import { 
  subscribeToRotas, 
  subscribeToGastos, 
  saveRota, 
  deleteRota, 
  saveGasto, 
  deleteGasto, 
  calcularResumo, 
  formatCurrency, 
  getTodayDateString, 
  getCurrentTimeString 
} from '../services/storage';
import confetti from 'canvas-confetti';
import { 
  Bike, 
  DollarSign, 
  Fuel, 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  History, 
  Trash2, 
  CheckCircle, 
  Clock, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Share2, 
  Download, 
  Search, 
  Filter, 
  RotateCcw,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Flame
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'guest';

  // Active Tab: 'lancamentos' | 'historico'
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'historico'>('lancamentos');

  // Data states
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Form states - Entregas
  const [bairro, setBairro] = useState('');
  const [taxa, setTaxa] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [observacao, setObservacao] = useState('');

  // Form states - Gastos
  const [descricaoGasto, setDescricaoGasto] = useState('');
  const [valorGasto, setValorGasto] = useState('');
  const [categoriaGasto, setCategoriaGasto] = useState<CategoriaGasto>('gasolina');

  // Filter states for Histórico
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | 'ontem' | '7dias' | 'mes' | 'todos'>('hoje');
  const [termoBusca, setTermoBusca] = useState('');

  // Notifications / Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Trigger brief feedback notice
  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Real-time synchronization
  useEffect(() => {
    setIsLoadingData(true);
    let unsubRotas = () => {};
    let unsubGastos = () => {};

    if (userId) {
      unsubRotas = subscribeToRotas(userId, (loadedRotas) => {
        setRotas(loadedRotas);
        setIsLoadingData(false);
      });

      unsubGastos = subscribeToGastos(userId, (loadedGastos) => {
        setGastos(loadedGastos);
        setIsLoadingData(false);
      });
    }

    return () => {
      unsubRotas();
      unsubGastos();
    };
  }, [userId]);

  // Today string
  const todayStr = useMemo(() => getTodayDateString(), []);

  // Today's items for quick view
  const rotasHoje = useMemo(() => {
    return rotas.filter(r => r.data === todayStr);
  }, [rotas, todayStr]);

  const gastosHoje = useMemo(() => {
    return gastos.filter(g => g.data === todayStr);
  }, [gastos, todayStr]);

  const resumoHoje = useMemo(() => {
    return calcularResumo(rotasHoje, gastosHoje);
  }, [rotasHoje, gastosHoje]);

  // Filtered History
  const { rotasFiltradas, gastosFiltrados } = useMemo(() => {
    const now = new Date();
    const today = getTodayDateString();
    
    // Ontem
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

    // 7 dias atrás
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Mês atual
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const matchPeriod = (dateStr: string) => {
      if (filtroPeriodo === 'hoje') return dateStr === today;
      if (filtroPeriodo === 'ontem') return dateStr === yesterdayStr;
      if (filtroPeriodo === '7dias') {
        const itemDate = new Date(dateStr + 'T00:00:00');
        return itemDate >= sevenDaysAgo;
      }
      if (filtroPeriodo === 'mes') return dateStr.startsWith(currentMonthPrefix);
      return true; // 'todos'
    };

    const searchLow = termoBusca.trim().toLowerCase();

    const rf = rotas.filter(r => {
      const matchP = matchPeriod(r.data);
      const matchS = !searchLow || r.bairro.toLowerCase().includes(searchLow) || (r.observacao && r.observacao.toLowerCase().includes(searchLow));
      return matchP && matchS;
    });

    const gf = gastos.filter(g => {
      const matchP = matchPeriod(g.data);
      const matchS = !searchLow || g.descricao.toLowerCase().includes(searchLow) || g.categoria.toLowerCase().includes(searchLow);
      return matchP && matchS;
    });

    return { rotasFiltradas: rf, gastosFiltrados: gf };
  }, [rotas, gastos, filtroPeriodo, termoBusca]);

  const resumoFiltrado = useMemo(() => {
    return calcularResumo(rotasFiltradas, gastosFiltrados);
  }, [rotasFiltradas, gastosFiltrados]);

  // Handlers
  const handleAdicionarRota = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(taxa.replace(',', '.'));
    if (!bairro.trim() || isNaN(valorNum) || valorNum <= 0) {
      showNotice('Informe o bairro e uma taxa válida!', 'error');
      return;
    }

    const novaRota: Rota = {
      id: 'rota_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      bairro: bairro.trim(),
      taxa: valorNum,
      formaPagamento,
      status: 'concluida',
      observacao: observacao.trim() || undefined,
      data: getTodayDateString(),
      horario: getCurrentTimeString(),
      userId,
      createdAt: Date.now()
    };

    await saveRota(novaRota);
    setBairro('');
    setTaxa('');
    setObservacao('');
    showNotice(`Rota para "${novaRota.bairro}" adicionada: +${formatCurrency(valorNum)}!`);

    // Little celebration for every 5 deliveries today
    if ((rotasHoje.length + 1) % 5 === 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (e) {}
    }
  };

  const handleAdicionarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(valorGasto.replace(',', '.'));
    if (!descricaoGasto.trim() || isNaN(valorNum) || valorNum <= 0) {
      showNotice('Informe a descrição e um valor de gasto válido!', 'error');
      return;
    }

    const novoGasto: Gasto = {
      id: 'gasto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      descricao: descricaoGasto.trim(),
      valor: valorNum,
      categoria: categoriaGasto,
      data: getTodayDateString(),
      horario: getCurrentTimeString(),
      userId,
      createdAt: Date.now()
    };

    await saveGasto(novoGasto);
    setDescricaoGasto('');
    setValorGasto('');
    showNotice(`Gasto "${novoGasto.descricao}" de ${formatCurrency(valorNum)} registrado.`);
  };

  const handleRemoverRota = async (rotaId: string, nomeBairro: string) => {
    if (window.confirm(`Deseja realmente excluir a entrega de "${nomeBairro}"?`)) {
      await deleteRota(userId, rotaId);
      showNotice('Rota removida com sucesso!');
    }
  };

  const handleRemoverGasto = async (gastoId: string, nomeDesc: string) => {
    if (window.confirm(`Deseja realmente excluir o gasto "${nomeDesc}"?`)) {
      await deleteGasto(userId, gastoId);
      showNotice('Gasto removido com sucesso!');
    }
  };

  // Quick WhatsApp summary generator
  const handleCompartilharWhatsApp = () => {
    const texto = `🏍️ *SCGE - Relatório de Entregas*\n` +
      `📅 Período: ${filtroPeriodo === 'hoje' ? 'Hoje' : filtroPeriodo.toUpperCase()}\n\n` +
      `📦 *Entregas Realizadas:* ${resumoFiltrado.qtdRotas}\n` +
      `💰 *Total de Taxas:* ${formatCurrency(resumoFiltrado.totalFaturado)}\n` +
      `⛽ *Total de Gastos:* ${formatCurrency(resumoFiltrado.totalGastos)}\n` +
      `📈 *Lucro Líquido:* ${formatCurrency(resumoFiltrado.saldoLiquido)}\n` +
      `🎯 *Média p/ Entrega:* ${formatCurrency(resumoFiltrado.mediaPorRota)}\n\n` +
      `_Gerado pelo SCGE - Controle de Entregas_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  // Export CSV
  const handleExportarCSV = () => {
    let csv = 'Tipo,Data,Horario,Descricao/Bairro,Valor,Detalhes\n';
    rotasFiltradas.forEach(r => {
      csv += `Rota,${r.data},${r.horario},"${r.bairro}",${r.taxa},${r.formaPagamento}\n`;
    });
    gastosFiltrados.forEach(g => {
      csv += `Gasto,${g.data},${g.horario},"${g.descricao}",-${g.valor},${g.categoria}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `scge_relatorio_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('Relatório CSV baixado com sucesso!');
  };

  return (
    <main className="dashboard-container max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      
      {/* Toast Notification */}
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border text-sm font-semibold flex items-center gap-3 transition-all animate-bounce ${
          feedback.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-950/50'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <MinusCircle className="w-5 h-5 text-rose-400" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* NAVEGAÇÃO INTERNA / TABS */}
      <div className="dashboard-tabs flex items-center justify-center sm:justify-start gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 max-w-md mx-auto sm:mx-0 shadow-lg">
        <button 
          id="tab-lancamentos"
          onClick={() => setActiveTab('lancamentos')}
          className={`tab-btn flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'lancamentos'
              ? 'active bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Lançamentos de Hoje</span>
        </button>

        <button 
          id="tab-historico"
          onClick={() => setActiveTab('historico')}
          className={`tab-btn flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'historico'
              ? 'active bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Consultar Histórico</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* ABA 1: LANÇAMENTOS DO DIA                                 */}
      {/* ========================================================= */}
      {activeTab === 'lancamentos' && (
        <section id="view-lancamentos" className="dashboard-view active space-y-6">
          
          {/* Header Animado com Moto */}
          <div className="avatar-header bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-900/40 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Bike className="w-9 h-9 text-white moto-drive" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-slate-900" title="Online"></div>
              </div>
              <div>
                <h2 className="dashboard-title text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Lançamentos de Hoje
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Adicione rotas e despesas diárias em tempo real
                </p>
              </div>
            </div>

            {/* Quick Today Stats Pill */}
            <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 px-4 py-2.5 rounded-2xl">
              <div className="text-center pr-3 border-r border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Corridas</span>
                <span className="text-base font-black text-white">{resumoHoje.qtdRotas}</span>
              </div>
              <div className="text-center pr-3 border-r border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Faturado</span>
                <span className="text-base font-black text-emerald-400">{formatCurrency(resumoHoje.totalFaturado)}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Lucro Hoje</span>
                <span className={`text-base font-black ${resumoHoje.saldoLiquido >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {formatCurrency(resumoHoje.saldoLiquido)}
                </span>
              </div>
            </div>
          </div>

          {/* GRID DE ENTRADAS: ROTAS vs GASTOS */}
          <div className="grid-container grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bloco 1: Entregas - Rotas */}
            <div className="section-box bg-slate-900/90 border border-indigo-900/50 rounded-3xl p-6 shadow-xl shadow-indigo-950/20 flex flex-col justify-between">
              <div>
                <div className="section-header flex items-center justify-between pb-4 mb-4 border-b border-indigo-950">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Bike className="w-5 h-5" />
                    </div>
                    <span className="section-title text-base sm:text-lg font-bold text-white tracking-wide">
                      Entregas - Rotas
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold">
                    Entrada (+)
                  </span>
                </div>

                <form id="form-entregas" onSubmit={handleAdicionarRota} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                      Bairro / Destino
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        id="bairro" 
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        placeholder="Ex: Centro, Jd. Paulista, Bela Vista" 
                        required 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                        Valor da Taxa (R$)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="number" 
                          id="taxa" 
                          value={taxa}
                          onChange={(e) => setTaxa(e.target.value)}
                          placeholder="15.00" 
                          step="0.01" 
                          min="0"
                          required 
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                        Forma de Pagamento
                      </label>
                      <select
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartao">Cartão</option>
                        <option value="outros">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1">
                      Observação (opcional)
                    </label>
                    <input 
                      type="text" 
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Ex: Pedido iFood #128, troco p/ R$ 50" 
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-submit w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Adicionar Rota</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Bloco 2: Gastos do dia */}
            <div className="section-box bg-slate-900/90 border border-rose-900/30 rounded-3xl p-6 shadow-xl shadow-rose-950/10 flex flex-col justify-between">
              <div>
                <div className="section-header flex items-center justify-between pb-4 mb-4 border-b border-rose-950/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <span className="section-title text-base sm:text-lg font-bold text-white tracking-wide">
                      Gastos do dia
                    </span>
                  </div>
                  <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md font-semibold">
                    Saída (-)
                  </span>
                </div>

                <form id="form-gastos" onSubmit={handleAdicionarGasto} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                      Descrição do Gasto
                    </label>
                    <div className="relative">
                      <Fuel className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        id="descricao" 
                        value={descricaoGasto}
                        onChange={(e) => setDescricaoGasto(e.target.value)}
                        placeholder="Ex: Gasolina Posto Shell, Almoço, Óleo" 
                        required 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                        Valor (R$)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="number" 
                          id="valor-gasto" 
                          value={valorGasto}
                          onChange={(e) => setValorGasto(e.target.value)}
                          placeholder="25.00" 
                          step="0.01" 
                          min="0"
                          required 
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                        Categoria
                      </label>
                      <select
                        value={categoriaGasto}
                        onChange={(e) => setCategoriaGasto(e.target.value as CategoriaGasto)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 transition"
                      >
                        <option value="gasolina">Gasolina / Combustível</option>
                        <option value="alimentacao">Alimentação / Lanche</option>
                        <option value="oleo">Troca de Óleo</option>
                        <option value="manutencao">Manutenção / Pneu</option>
                        <option value="multa">Pedágio / Multa</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick preset buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Atalhos rápidos:</span>
                    <button
                      type="button"
                      onClick={() => { setDescricaoGasto('Gasolina'); setCategoriaGasto('gasolina'); setValorGasto('30'); }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 cursor-pointer"
                    >
                      Gasolina R$30
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDescricaoGasto('Almoço'); setCategoriaGasto('alimentacao'); setValorGasto('20'); }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-300 cursor-pointer"
                    >
                      Almoço R$20
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-submit w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-600/20 transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <MinusCircle className="w-4 h-4" />
                    <span>- Adicionar Gasto</span>
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* LISTA RESUMIDA DOS LANÇAMENTOS DE HOJE */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Feitos Hoje ({rotasHoje.length} rotas, {gastosHoje.length} gastos)
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('historico')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Histórico Completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {rotasHoje.length === 0 && gastosHoje.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum lançamento registrado hoje ainda. Use os formulários acima para começar o seu dia! 🚀
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rotas de hoje */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Rotas de Hoje
                  </span>
                  {rotasHoje.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">Nenhuma rota hoje.</p>
                  ) : (
                    rotasHoje.map(r => (
                      <div key={r.id} className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 group hover:border-emerald-500/30 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                            <Bike className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{r.bairro}</p>
                            <span className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>{r.horario}</span>
                              <span>•</span>
                              <span className="uppercase text-slate-500 font-semibold">{r.formaPagamento}</span>
                              {r.observacao && <span>• {r.observacao}</span>}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-extrabold text-emerald-400">
                            +{formatCurrency(r.taxa)}
                          </span>
                          <button
                            onClick={() => handleRemoverRota(r.id, r.bairro)}
                            className="text-slate-600 hover:text-rose-400 transition p-1 cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Gastos de hoje */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Gastos de Hoje
                  </span>
                  {gastosHoje.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">Nenhum gasto hoje.</p>
                  ) : (
                    gastosHoje.map(g => (
                      <div key={g.id} className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 group hover:border-rose-500/30 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                            <Fuel className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{g.descricao}</p>
                            <span className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>{g.horario}</span>
                              <span>•</span>
                              <span className="capitalize text-slate-500 font-medium">{g.categoria}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-extrabold text-rose-400">
                            -{formatCurrency(g.valor)}
                          </span>
                          <button
                            onClick={() => handleRemoverGasto(g.id, g.descricao)}
                            className="text-slate-600 hover:text-rose-400 transition p-1 cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </section>
      )}

      {/* ========================================================= */}
      {/* ABA 2: CONSULTAR HISTÓRICO                                */}
      {/* ========================================================= */}
      {activeTab === 'historico' && (
        <section id="view-historico" className="dashboard-view space-y-6">
          
          <div className="text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
            <div>
              <h2 className="dashboard-title text-2xl font-black text-white tracking-tight">
                Histórico de Lançamentos
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Consulte todas as rotas, gastos e saldo detalhado do período
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center sm:justify-end gap-2.5">
              <button
                onClick={handleCompartilharWhatsApp}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950/40 cursor-pointer"
                title="Compartilhar resumo via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleExportarCSV}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Exportar planilha CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* FILTROS E BUSCA */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Filtros de período */}
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Período:
              </span>
              {(['hoje', 'ontem', '7dias', 'mes', 'todos'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setFiltroPeriodo(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
                    filtroPeriodo === p
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {p === '7dias' ? 'Últimos 7 dias' : p === 'mes' ? 'Este Mês' : p}
                </button>
              ))}
            </div>

            {/* Barra de Busca */}
            <div className="w-full md:w-64 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Buscar bairro ou gasto..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* GRID COM HISTÓRICO DE ROTAS E GASTOS */}
          <div className="grid-container grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card Rotas Realizadas */}
            <div className="section-box bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
              <div className="section-header flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bike className="w-5 h-5 text-emerald-400" />
                  <span className="section-title text-base font-bold text-white">
                    Rotas Realizadas
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {rotasFiltradas.length} rotas ({formatCurrency(resumoFiltrado.totalFaturado)})
                </span>
              </div>

              <ul id="lista-historico-rotas" className="lista-historico space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {isLoadingData ? (
                  <li className="text-center py-8 text-slate-400 text-sm flex items-center justify-center gap-2">
                    <span className="animate-spin text-indigo-400">🔄</span> Carregando histórico de entregas...
                  </li>
                ) : rotasFiltradas.length === 0 ? (
                  <li className="text-center py-8 text-slate-500 text-sm">
                    Nenhuma rota encontrada para o período selecionado.
                  </li>
                ) : (
                  rotasFiltradas.map((r) => (
                    <li 
                      key={r.id} 
                      className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 hover:border-emerald-500/30 transition group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                            {r.bairro}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {r.data.split('-').reverse().join('/')}
                            </span>
                            <span>•</span>
                            <span>{r.horario}</span>
                            <span>•</span>
                            <span className="uppercase text-slate-300 font-semibold bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">
                              {r.formaPagamento}
                            </span>
                          </div>
                          {r.observacao && (
                            <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-900/60 px-2 py-0.5 rounded">
                              "{r.observacao}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm sm:text-base font-black text-emerald-400">
                          +{formatCurrency(r.taxa)}
                        </span>
                        <button
                          onClick={() => handleRemoverRota(r.id, r.bairro)}
                          className="text-slate-600 hover:text-rose-400 p-1.5 transition rounded-lg hover:bg-slate-800 cursor-pointer"
                          title="Excluir rota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Card Gastos Registrados */}
            <div className="section-box bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
              <div className="section-header flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-rose-400" />
                  <span className="section-title text-base font-bold text-white">
                    Gastos Registrados
                  </span>
                </div>
                <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  {gastosFiltrados.length} gastos ({formatCurrency(resumoFiltrado.totalGastos)})
                </span>
              </div>

              <ul id="lista-historico-gastos" className="lista-historico space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {isLoadingData ? (
                  <li className="text-center py-8 text-slate-400 text-sm flex items-center justify-center gap-2">
                    <span className="animate-spin text-rose-400">🔄</span> Carregando histórico de gastos...
                  </li>
                ) : gastosFiltrados.length === 0 ? (
                  <li className="text-center py-8 text-slate-500 text-sm">
                    Nenhum gasto registrado para o período selecionado.
                  </li>
                ) : (
                  gastosFiltrados.map((g) => (
                    <li 
                      key={g.id} 
                      className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 hover:border-rose-500/30 transition group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Fuel className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-rose-300 transition">
                            {g.descricao}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {g.data.split('-').reverse().join('/')}
                            </span>
                            <span>•</span>
                            <span>{g.horario}</span>
                            <span>•</span>
                            <span className="capitalize text-slate-300 font-semibold bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">
                              {g.categoria}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm sm:text-base font-black text-rose-400">
                          -{formatCurrency(g.valor)}
                        </span>
                        <button
                          onClick={() => handleRemoverGasto(g.id, g.descricao)}
                          className="text-slate-600 hover:text-rose-400 p-1.5 transition rounded-lg hover:bg-slate-800 cursor-pointer"
                          title="Excluir gasto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

          </div>

          {/* CARD DE RESUMO GERAL */}
          <div className="section-box bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="section-header pb-4 mb-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-cyan-400" />
                <span className="section-title text-lg font-bold text-white">
                  Resumo Geral do Período ({filtroPeriodo === 'hoje' ? 'Hoje' : filtroPeriodo.toUpperCase()})
                </span>
              </div>
            </div>

            <div id="resumo-valores" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Faturado */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Total Faturado
                </span>
                <p className="text-lg sm:text-2xl font-black text-emerald-400">
                  {formatCurrency(resumoFiltrado.totalFaturado)}
                </p>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {resumoFiltrado.qtdRotas} corrida(s)
                </span>
              </div>

              {/* Card 2: Total Gastos */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  Total de Gastos
                </span>
                <p className="text-lg sm:text-2xl font-black text-rose-400">
                  {formatCurrency(resumoFiltrado.totalGastos)}
                </p>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {gastosFiltrados.length} despesa(s)
                </span>
              </div>

              {/* Card 3: Saldo Líquido */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 bg-indigo-950/20">
                <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  Saldo Líquido (Lucro)
                </span>
                <p className={`text-lg sm:text-2xl font-black ${resumoFiltrado.saldoLiquido >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {formatCurrency(resumoFiltrado.saldoLiquido)}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {resumoFiltrado.saldoLiquido >= 0 ? 'Lucro no bolso' : 'Em desfalque'}
                </span>
              </div>

              {/* Card 4: Média por Corrida */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Média por Corrida
                </span>
                <p className="text-lg sm:text-2xl font-black text-amber-300">
                  {formatCurrency(resumoFiltrado.mediaPorRota)}
                </p>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Taxa média obtida
                </span>
              </div>

            </div>

            {/* Breakdown de Pagamentos */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Entradas por forma de pagamento:</span>
              <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                PIX: <strong className="text-white">{formatCurrency(resumoFiltrado.porPagamento.pix)}</strong>
              </span>
              <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                Dinheiro: <strong className="text-white">{formatCurrency(resumoFiltrado.porPagamento.dinheiro)}</strong>
              </span>
              <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                Cartão: <strong className="text-white">{formatCurrency(resumoFiltrado.porPagamento.cartao)}</strong>
              </span>
            </div>

          </div>

          {/* Botão Voltar para Lançamentos com ID Original */}
          <div className="text-center pt-2">
            <button 
              id="btn-voltar-hoje"
              onClick={() => setActiveTab('lancamentos')}
              className="tab-btn px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/30 transition transform active:scale-98 cursor-pointer inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Voltar para Lançamentos</span>
            </button>
          </div>

        </section>
      )}

    </main>
  );
};
