// Módulo do Dashboard universal
document.addEventListener('DOMContentLoaded', () => {
  const isFileProtocol = window.location.protocol === 'file:';

  // --- UTILITÁRIOS ---
  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }

  function getDataHoje() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  function getHoraAtual() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  function formatDateToInput(date) {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
  }

  // --- ELEMENTOS DO DOM ---
  const btnSair = document.getElementById('btn-sair');
  const tabLancamentos = document.getElementById('tab-lancamentos');
  const tabHistorico = document.getElementById('tab-historico');
  const viewLancamentos = document.getElementById('view-lancamentos');
  const viewHistorico = document.getElementById('view-historico');
  const btnVoltarHoje = document.getElementById('btn-voltar-hoje');

  const formEntregas = document.getElementById('form-entregas');
  const formGastos = document.getElementById('form-gastos');
  
  const inputDataEntrega = document.getElementById('data-entrega');
  const inputDataGasto = document.getElementById('data-gasto');

  const listaRotas = document.getElementById('lista-historico-rotas');
  const listaGastos = document.getElementById('lista-historico-gastos');
  const resumoValores = document.getElementById('resumo-valores');

  const filtroDataInicio = document.getElementById('filtro-data-inicio');
  const filtroDataFim = document.getElementById('filtro-data-fim');
  
  const btnHoje = document.getElementById('btn-hoje');
  const btnEstaSemana = document.getElementById('btn-esta-semana');
  const btnEsteMes = document.getElementById('btn-este-mes');

  // --- ESTADO ---
  let rotas = [];
  let gastos = [];
  let usuarioId = 'local_user';

  // --- 1. BOTÃO SAIR ---
  if (btnSair) {
    btnSair.addEventListener('click', async (e) => {
      e.preventDefault();
      btnSair.textContent = 'Saindo...';
      try {
        localStorage.removeItem('scge_guest_session');
        if (typeof firebase !== 'undefined' && firebase.auth) await firebase.auth().signOut();
      } catch (err) { console.warn(err); } 
      finally { window.location.href = 'index.html'; }
    });
  }

  // --- 2. NAVEGAÇÃO ENTRE ABAS ---
  function alternarAba(aba) {
    if (aba === 'lancamentos') {
      if (tabLancamentos) tabLancamentos.classList.add('active');
      if (tabHistorico) tabHistorico.classList.remove('active');
      if (viewLancamentos) viewLancamentos.style.display = 'block';
      if (viewHistorico) viewHistorico.style.display = 'none';
    } else {
      if (tabHistorico) tabHistorico.classList.add('active');
      if (tabLancamentos) tabLancamentos.classList.remove('active');
      if (viewLancamentos) viewLancamentos.style.display = 'none';
      if (viewHistorico) viewHistorico.style.display = 'block';
      
      if (filtroDataInicio && !filtroDataInicio.value) filtroDataInicio.value = getDataHoje();
      if (filtroDataFim && !filtroDataFim.value) filtroDataFim.value = getDataHoje();
      
      renderizarHistorico();
    }
  }

  if (tabLancamentos) tabLancamentos.addEventListener('click', (e) => { e.preventDefault(); alternarAba('lancamentos'); });
  if (tabHistorico) tabHistorico.addEventListener('click', (e) => { e.preventDefault(); alternarAba('historico'); });
  if (btnVoltarHoje) btnVoltarHoje.addEventListener('click', (e) => { e.preventDefault(); alternarAba('lancamentos'); });

  if (filtroDataInicio) filtroDataInicio.addEventListener('change', renderizarHistorico);
  if (filtroDataFim) filtroDataFim.addEventListener('change', renderizarHistorico);

  // --- 3. LÓGICA DOS BOTÕES DE FILTRO RÁPIDO ---
  if (btnHoje) {
    btnHoje.addEventListener('click', (e) => {
      e.preventDefault();
      const hoje = getDataHoje();
      if (filtroDataInicio) filtroDataInicio.value = hoje;
      if (filtroDataFim) filtroDataFim.value = hoje;
      renderizarHistorico();
    });
  }

  if (btnEstaSemana) {
    btnEstaSemana.addEventListener('click', (e) => {
      e.preventDefault();
      const hoje = new Date();
      const diaDaSemana = hoje.getDay(); // 0 = Domingo
      const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - diaDaSemana);
      const fimSemana = new Date(hoje); fimSemana.setDate(hoje.getDate() + (6 - diaDaSemana));

      if (filtroDataInicio) filtroDataInicio.value = formatDateToInput(inicioSemana);
      if (filtroDataFim) filtroDataFim.value = formatDateToInput(fimSemana);
      renderizarHistorico();
    });
  }

  if (btnEsteMes) {
    btnEsteMes.addEventListener('click', (e) => {
      e.preventDefault();
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      
      if (filtroDataInicio) filtroDataInicio.value = formatDateToInput(primeiroDiaMes);
      if (filtroDataFim) filtroDataFim.value = formatDateToInput(ultimoDiaMes);
      renderizarHistorico();
    });
  }

  // --- 4. ARMAZENAMENTO LOCAL ---
  function getStorageKey(prefix) { return `scge_${prefix}_${usuarioId}`; }

  function carregarCacheLocal() {
    try {
      const rotasCache = localStorage.getItem(getStorageKey('rotas'));
      if (rotasCache) rotas = JSON.parse(rotasCache);
      const gastosCache = localStorage.getItem(getStorageKey('gastos'));
      if (gastosCache) gastos = JSON.parse(gastosCache);
    } catch (e) { console.warn('Erro ao carregar cache local:', e); }
  }

  function salvarCacheLocal() {
    try {
      localStorage.setItem(getStorageKey('rotas'), JSON.stringify(rotas));
      localStorage.setItem(getStorageKey('gastos'), JSON.stringify(gastos));
    } catch (e) { console.warn('Erro ao salvar cache:', e); }
  }

  // --- 5. RENDERIZAR HISTÓRICO (COM CONTADORES E FILTRO) ---
  function renderizarHistorico() {
    if (!listaRotas || !listaGastos || !resumoValores) return;

    const strInicio = filtroDataInicio && filtroDataInicio.value ? filtroDataInicio.value : getDataHoje();
    const strFim = filtroDataFim && filtroDataFim.value ? filtroDataFim.value : getDataHoje();

    const dataInicioTime = new Date(strInicio + 'T00:00:00').getTime();
    const dataFimTime = new Date(strFim + 'T23:59:59').getTime();

    // Filtra pelas datas
    const rotasFiltradas = rotas.filter(r => {
      if(!r.data) return false;
      return new Date(r.data + 'T12:00:00').getTime() >= dataInicioTime && new Date(r.data + 'T12:00:00').getTime() <= dataFimTime;
    });

    const gastosFiltrados = gastos.filter(g => {
      if(!g.data) return false;
      return new Date(g.data + 'T12:00:00').getTime() >= dataInicioTime && new Date(g.data + 'T12:00:00').getTime() <= dataFimTime;
    });

    // Renderiza a Lista de Rotas
    if (rotasFiltradas.length === 0) {
      listaRotas.innerHTML = '<li style="text-align:center; padding: 25px; color: #94a3b8;">Nenhuma rota cadastrada neste período.</li>';
    } else {
      listaRotas.innerHTML = rotasFiltradas.map(r => `
        <li class="item-historico">
          <div class="item-info">
            <strong>${r.bairro}</strong>
            <span>📅 ${r.data ? r.data.split('-').reverse().join('/') : '--/--'} às ${r.horario || '--:--'}</span>
          </div>
          <div class="item-valor">
            <span class="valor-positivo">+${formatarMoeda(r.taxa)}</span>
            <button class="btn-excluir" onclick="window.excluirRota('${r.id}')">🗑️</button>
          </div>
        </li>
      `).join('');
    }

    // Renderiza a Lista de Gastos
    if (gastosFiltrados.length === 0) {
      listaGastos.innerHTML = '<li style="text-align:center; padding: 25px; color: #94a3b8;">Nenhum gasto cadastrado neste período.</li>';
    } else {
      listaGastos.innerHTML = gastosFiltrados.map(g => `
        <li class="item-historico">
          <div class="item-info">
            <strong>${g.descricao}</strong>
            <span>📅 ${g.data ? g.data.split('-').reverse().join('/') : '--/--'} às ${g.horario || '--:--'}</span>
          </div>
          <div class="item-valor">
            <span class="valor-negativo">-${formatarMoeda(g.valor)}</span>
            <button class="btn-excluir" onclick="window.excluirGasto('${g.id}')">🗑️</button>
          </div>
        </li>
      `).join('');
    }

    // Cálculos do Resumo (Adicionando as Quantidades)
    const totalFaturado = rotasFiltradas.reduce((acc, r) => acc + (parseFloat(r.taxa) || 0), 0);
    const totalGastos = gastosFiltrados.reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);
    const saldoLiquido = totalFaturado - totalGastos;
    
    const qtdRotas = rotasFiltradas.length;
    const qtdGastos = gastosFiltrados.length;
    const mediaPorRota = qtdRotas > 0 ? (totalFaturado / qtdRotas) : 0;

    resumoValores.innerHTML = `
      <div class="resumo-grid">
        <div class="resumo-card">
          <span>Total Faturado</span>
          <h4 style="color: #34d399;">${formatarMoeda(totalFaturado)}</h4>
        </div>
        <div class="resumo-card">
          <span>Qtd. de Entregas</span>
          <h4 style="color: #34d399;">${qtdRotas}</h4>
        </div>
        
        <div class="resumo-card">
          <span>Total de Gastos</span>
          <h4 style="color: #f87171;">${formatarMoeda(totalGastos)}</h4>
        </div>
        <div class="resumo-card">
          <span>Qtd. de Gastos</span>
          <h4 style="color: #f87171;">${qtdGastos}</h4>
        </div>

        <div class="resumo-card">
          <span>Saldo Líquido</span>
          <h4 style="color: ${saldoLiquido >= 0 ? '#38bdf8' : '#f87171'};">${formatarMoeda(saldoLiquido)}</h4>
        </div>
        <div class="resumo-card">
          <span>Média p/ Rota</span>
          <h4 style="color: #fbbf24;">${formatarMoeda(mediaPorRota)}</h4>
        </div>
      </div>
    `;
  }

  // --- EXCLUSÃO ---
  window.excluirRota = async function(id) {
    if (confirm('Deseja realmente remover esta rota?')) {
      rotas = rotas.filter(r => r.id !== id);
      salvarCacheLocal();
      renderizarHistorico();
      if (typeof firebase !== 'undefined' && firebase.firestore && usuarioId && !usuarioId.startsWith('local')) {
        try { await firebase.firestore().collection('users').doc(usuarioId).collection('rotas').doc(id).delete(); } catch (e) { console.warn(e); }
      }
    }
  };

  window.excluirGasto = async function(id) {
    if (confirm('Deseja realmente remover este gasto?')) {
      gastos = gastos.filter(g => g.id !== id);
      salvarCacheLocal();
      renderizarHistorico();
      if (typeof firebase !== 'undefined' && firebase.firestore && usuarioId && !usuarioId.startsWith('local')) {
        try { await firebase.firestore().collection('users').doc(usuarioId).collection('gastos').doc(id).delete(); } catch (e) { console.warn(e); }
      }
    }
  };

  // --- 6. INICIALIZAÇÃO E SANFONA (RECOLHER LISTAS) ---
  carregarCacheLocal();
  
  if (filtroDataInicio) filtroDataInicio.value = getDataHoje();
  if (filtroDataFim) filtroDataFim.value = getDataHoje();
  if (inputDataEntrega) inputDataEntrega.value = getDataHoje();
  if (inputDataGasto) inputDataGasto.value = getDataHoje();
  
  renderizarHistorico();

  // Lógica da Sanfona (Recolher/Expandir)
  const headerRotas = document.getElementById('header-rotas');
  const conteudoRotas = document.getElementById('conteudo-rotas');
  const iconeRotas = document.getElementById('icone-rotas');

  const headerGastos = document.getElementById('header-gastos');
  const conteudoGastos = document.getElementById('conteudo-gastos');
  const iconeGastos = document.getElementById('icone-gastos');

  if (headerRotas && conteudoRotas) {
    headerRotas.addEventListener('click', () => {
      const isHidden = conteudoRotas.style.display === 'none';
      conteudoRotas.style.display = isHidden ? 'block' : 'none';
      iconeRotas.textContent = isHidden ? '▼' : '▶';
    });
  }

  if (headerGastos && conteudoGastos) {
    headerGastos.addEventListener('click', () => {
      const isHidden = conteudoGastos.style.display === 'none';
      conteudoGastos.style.display = isHidden ? 'block' : 'none';
      iconeGastos.textContent = isHidden ? '▼' : '▶';
    });
  }

  // Firebase Auth
  if (typeof firebase !== 'undefined' && firebase.auth && !isFileProtocol) {
    try {
      firebase.auth().onAuthStateChanged((user) => {
        const guestSession = localStorage.getItem('scge_guest_session');
        if (!user && !guestSession) { window.location.href = 'index.html'; return; }

        if (user) {
          usuarioId = user.uid;
          carregarCacheLocal();
          renderizarHistorico();

          if (firebase.firestore) {
            const db = firebase.firestore();
            db.collection('users').doc(usuarioId).collection('rotas').orderBy('createdAt', 'desc')
              .onSnapshot((snapshot) => {
                const fsRotas = [];
                snapshot.forEach(docSnap => fsRotas.push(docSnap.data()));
                rotas = fsRotas;
                salvarCacheLocal();
                renderizarHistorico();
              }, (err) => console.warn('Erro rotas:', err));

            db.collection('users').doc(usuarioId).collection('gastos').orderBy('createdAt', 'desc')
              .onSnapshot((snapshot) => {
                const fsGastos = [];
                snapshot.forEach(docSnap => fsGastos.push(docSnap.data()));
                gastos = fsGastos;
                salvarCacheLocal();
                renderizarHistorico();
              }, (err) => console.warn('Erro gastos:', err));
          }
        }
      });
    } catch (e) { console.warn('Erro Auth:', e); }
  }

  // --- 7. ADICIONAR ROTA ---
  if (formEntregas) {
    formEntregas.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const bairroInput = document.getElementById('bairro');
      const taxaInput = document.getElementById('taxa');
      
      // CORREÇÃO CRÍTICA: Pega o elemento direto do DOM no momento do clique
      const dataInput = document.getElementById('data-entrega'); 

      const bairro = bairroInput.value.trim();
      const taxa = parseFloat(taxaInput.value.replace(',', '.'));
      
      // Garante que a string de data seja válida
      let dataEscolhida = dataInput ? dataInput.value : '';
      if (!dataEscolhida || dataEscolhida === '') {
        dataEscolhida = getDataHoje();
      }

      if (!bairro || isNaN(taxa) || taxa <= 0) {
        alert('Informe o bairro e uma taxa válida!');
        return;
      }

      const novaRota = {
        id: 'rota_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        bairro,
        taxa,
        data: dataEscolhida, // Salva a data que você escolheu no calendário
        horario: getHoraAtual(),
        createdAt: Date.now()
      };

      rotas.unshift(novaRota);
      salvarCacheLocal();
      renderizarHistorico();

      bairroInput.value = '';
      taxaInput.value = '';
      if (dataInput) dataInput.value = getDataHoje(); // Limpa para hoje após salvar

      if (typeof firebase !== 'undefined' && firebase.firestore && usuarioId && !usuarioId.startsWith('local')) {
        try {
          await firebase.firestore().collection('users').doc(usuarioId).collection('rotas').doc(novaRota.id).set(novaRota);
        } catch (err) {
          console.error("ERRO FIREBASE:", err);
          alert("Erro ao enviar para nuvem: " + err.message);
        }
      }
    });
  }

  // --- 8. ADICIONAR GASTO ---
  if (formGastos) {
    formGastos.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const descricaoInput = document.getElementById('descricao');
      const valorGastoInput = document.getElementById('valor-gasto');
      
      // CORREÇÃO CRÍTICA: Pega o elemento direto do DOM
      const dataInput = document.getElementById('data-gasto');

      const descricao = descricaoInput.value.trim();
      const valor = parseFloat(valorGastoInput.value.replace(',', '.'));
      
      let dataEscolhida = dataInput ? dataInput.value : '';
      if (!dataEscolhida || dataEscolhida === '') {
        dataEscolhida = getDataHoje();
      }

      if (!descricao || isNaN(valor) || valor <= 0) {
        alert('Informe a descrição e um valor de gasto válido!');
        return;
      }

      const novoGasto = {
        id: 'gasto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        descricao,
        valor,
        data: dataEscolhida, // Salva a data que você escolheu
        horario: getHoraAtual(),
        createdAt: Date.now()
      };

      gastos.unshift(novoGasto);
      salvarCacheLocal();
      renderizarHistorico();

      descricaoInput.value = '';
      valorGastoInput.value = '';
      if (dataInput) dataInput.value = getDataHoje(); // Limpa para hoje após salvar

      if (typeof firebase !== 'undefined' && firebase.firestore && usuarioId && !usuarioId.startsWith('local')) {
        try {
          await firebase.firestore().collection('users').doc(usuarioId).collection('gastos').doc(novoGasto.id).set(novoGasto);
        } catch (err) {
          console.error("ERRO FIREBASE:", err);
          alert("Erro ao enviar para nuvem: " + err.message);
        }
      }
    });
  }

});