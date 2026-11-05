// Módulo do Dashboard universal (funciona com ou sem servidor web)
document.addEventListener('DOMContentLoaded', () => {
  const isFileProtocol = window.location.protocol === 'file:';

  // Formatação monetária
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

  // Formata objeto Date para string YYYY-MM-DD (evitando problemas de fuso horário)
  function formatDateToInput(date) {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
  }

  // Elementos do DOM
  const btnSair = document.getElementById('btn-sair');
  const tabLancamentos = document.getElementById('tab-lancamentos');
  const tabHistorico = document.getElementById('tab-historico');
  const viewLancamentos = document.getElementById('view-lancamentos');
  const viewHistorico = document.getElementById('view-historico');
  const btnVoltarHoje = document.getElementById('btn-voltar-hoje');

  const formEntregas = document.getElementById('form-entregas');
  const formGastos = document.getElementById('form-gastos');

  const listaRotas = document.getElementById('lista-historico-rotas');
  const listaGastos = document.getElementById('lista-historico-gastos');
  const resumoValores = document.getElementById('resumo-valores');

  // Elementos do filtro de data
  const filtroDataInicio = document.getElementById('filtro-data-inicio');
  const filtroDataFim = document.getElementById('filtro-data-fim');
  
  const btnHoje = document.getElementById('btn-hoje');
  const btnEstaSemana = document.getElementById('btn-esta-semana');
  const btnEsteMes = document.getElementById('btn-este-mes');

  // Estado
  let rotas = [];
  let gastos = [];
  let usuarioId = 'local_user';

  // =========================================================================
  // 1. BOTÃO SAIR
  // =========================================================================
  if (btnSair) {
    btnSair.addEventListener('click', async (e) => {
      e.preventDefault();
      btnSair.textContent = 'Saindo...';
      try {
        localStorage.removeItem('scge_guest_session');
        if (typeof firebase !== 'undefined' && firebase.auth) {
          await firebase.auth().signOut();
        }
      } catch (err) {
        console.warn('Aviso durante signOut:', err);
      } finally {
        window.location.href = 'index.html';
      }
    });
  }

  // =========================================================================
  // 2. NAVEGAÇÃO ENTRE ABAS
  // =========================================================================
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
      
      // Se os campos estiverem vazios, preenche com o dia de hoje
      if (filtroDataInicio && !filtroDataInicio.value) {
        filtroDataInicio.value = getDataHoje();
      }
      if (filtroDataFim && !filtroDataFim.value) {
        filtroDataFim.value = getDataHoje();
      }
      renderizarHistorico();
    }
  }

  if (tabLancamentos) tabLancamentos.addEventListener('click', (e) => { e.preventDefault(); alternarAba('lancamentos'); });
  if (tabHistorico) tabHistorico.addEventListener('click', (e) => { e.preventDefault(); alternarAba('historico'); });
  if (btnVoltarHoje) btnVoltarHoje.addEventListener('click', (e) => { e.preventDefault(); alternarAba('lancamentos'); });

  // Eventos de mudança manual nos inputs de data
  if (filtroDataInicio) filtroDataInicio.addEventListener('change', renderizarHistorico);
  if (filtroDataFim) filtroDataFim.addEventListener('change', renderizarHistorico);

  // =========================================================================
  // 3. LÓGICA DOS BOTÕES DE FILTRO RÁPIDO
  // =========================================================================
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
      
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - diaDaSemana);
      
      const fimSemana = new Date(hoje);
      fimSemana.setDate(hoje.getDate() + (6 - diaDaSemana)); // Sábado

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

  // =========================================================================
  // 4. ARMAZENAMENTO LOCAL RESILIENTE
  // =========================================================================
  function getStorageKey(prefix) {
    return `scge_${prefix}_${usuarioId}`;
  }

  function carregarCacheLocal() {
    try {
      const rotasCache = localStorage.getItem(getStorageKey('rotas'));
      if (rotasCache) {
        rotas = JSON.parse(rotasCache);
      } else if (rotas.length === 0) {
        rotas = [
          { id: '1', bairro: 'Centro - Rua das Flores', taxa: 15.00, data: getDataHoje(), horario: '11:30' },
          { id: '2', bairro: 'Jardim América', taxa: 18.50, data: getDataHoje(), horario: '12:15' }
        ];
        salvarCacheLocal();
      }

      const gastosCache = localStorage.getItem(getStorageKey('gastos'));
      if (gastosCache) {
        gastos = JSON.parse(gastosCache);
      } else if (gastos.length === 0) {
        gastos = [
          { id: 'g1', descricao: 'Gasolina', valor: 25.00, data: getDataHoje(), horario: '10:00' }
        ];
        salvarCacheLocal();
      }
    } catch (e) {
      console.warn('Erro ao carregar cache local:', e);
    }
  }

  function salvarCacheLocal() {
    try {
      localStorage.setItem(getStorageKey('rotas'), JSON.stringify(rotas));
      localStorage.setItem(getStorageKey('gastos'), JSON.stringify(gastos));
    } catch (e) {
      console.warn('Erro ao salvar cache:', e);
    }
  }

  // =========================================================================
  // 5. RENDERIZAR HISTÓRICO E RESUMO GERAL (FILTRO DE INTERVALO)
  // =========================================================================
  function renderizarHistorico() {
    if (!listaRotas || !listaGastos || !resumoValores) return;

    const strInicio = filtroDataInicio && filtroDataInicio.value ? filtroDataInicio.value : getDataHoje();
    const strFim = filtroDataFim && filtroDataFim.value ? filtroDataFim.value : getDataHoje();

    // Converte strings "YYYY-MM-DD" para timestamps para comparação segura
    const dataInicioTime = new Date(strInicio + 'T00:00:00').getTime();
    const dataFimTime = new Date(strFim + 'T23:59:59').getTime();

    const rotasFiltradas = rotas.filter(r => {
      if(!r.data) return false;
      const tempoItem = new Date(r.data + 'T12:00:00').getTime();
      return tempoItem >= dataInicioTime && tempoItem <= dataFimTime;
    });

    const gastosFiltrados = gastos.filter(g => {
      if(!g.data) return false;
      const tempoItem = new Date(g.data + 'T12:00:00').getTime();
      return tempoItem >= dataInicioTime && tempoItem <= dataFimTime;
    });

    // Renderiza Rotas
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
            <button class="btn-excluir" onclick="window.excluirRota('${r.id}')" title="Excluir rota">🗑️</button>
          </div>
        </li>
      `).join('');
    }

    // Renderiza Gastos
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
            <button class="btn-excluir" onclick="window.excluirGasto('${g.id}')" title="Excluir gasto">🗑️</button>
          </div>
        </li>
      `).join('');
    }

    // Cálculos do Resumo
    const totalFaturado = rotasFiltradas.reduce((acc, r) => acc + (parseFloat(r.taxa) || 0), 0);
    const totalGastos = gastosFiltrados.reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);
    const saldoLiquido = totalFaturado - totalGastos;
    const qtdRotas = rotasFiltradas.length;
    const mediaPorRota = qtdRotas > 0 ? (totalFaturado / qtdRotas) : 0;

    resumoValores.innerHTML = `
      <div class="resumo-grid">
        <div class="resumo-card">
          <span>Total Faturado</span>
          <h4 style="color: #34d399;">${formatarMoeda(totalFaturado)}</h4>
        </div>
        <div class="resumo-card">
          <span>Total de Gastos</span>
          <h4 style="color: #f87171;">${formatarMoeda(totalGastos)}</h4>
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

  window.excluirRota = function(id) {
    if (confirm('Deseja realmente remover esta rota do histórico?')) {
      rotas = rotas.filter(r => r.id !== id);
      salvarCacheLocal();
      renderizarHistorico();

      if (typeof firebase !== 'undefined' && firebase.firestore && usuarioId && !usuarioId.startsWith('local')) {
        try {
          firebase.firestore().collection('users').doc(usuarioId).collection('rotas').doc(id).delete();
        } catch (e) {
          console.warn('Erro ao deletar no Firestore:', e);
        }
      }
    }
  };

  window.excluirGasto = function(id) {
    if (confirm('Deseja realmente remover este gasto do histórico?')) {
      gastos = gastos.filter(g => g.id !== id);
      salvarCacheLocal();
      renderizarHistorico();

      if (typeof firebase !== 'undefined' && firebase.firestore && usuarioId && !usuarioId.startsWith('local')) {
        try {
          firebase.firestore().collection('users').doc(usuarioId).collection('gastos').doc(id).delete();
        } catch (e) {
          console.warn('Erro ao deletar no Firestore:', e);
        }
      }
    }
  };

  // =========================================================================
  // 6. INICIALIZAÇÃO DE SESSÃO COM FIREBASE OU LOCAL
  // =========================================================================
  carregarCacheLocal();
  
  // Preenche os campos de data com hoje ao abrir a página
  if (filtroDataInicio) filtroDataInicio.value = getDataHoje();
  if (filtroDataFim) filtroDataFim.value = getDataHoje();
  
  renderizarHistorico();

  if (typeof firebase !== 'undefined' && firebase.auth && !isFileProtocol) {
    try {
      firebase.auth().onAuthStateChanged((user) => {
        const guestSession = localStorage.getItem('scge_guest_session');

        if (!user && !guestSession) {
          window.location.href = 'index.html';
          return;
        }

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
                if (fsRotas.length > 0) {
                  rotas = fsRotas;
                  salvarCacheLocal();
                  renderizarHistorico();
                }
              }, (err) => console.warn('Firestore rotas:', err));

            db.collection('users').doc(usuarioId).collection('gastos').orderBy('createdAt', 'desc')
              .onSnapshot((snapshot) => {
                const fsGastos = [];
                snapshot.forEach(docSnap => fsGastos.push(docSnap.data()));
                if (fsGastos.length > 0) {
                  gastos = fsGastos;
                  salvarCacheLocal();
                  renderizarHistorico();
                }
              }, (err) => console.warn('Firestore gastos:', err));
          }
        }
      });
    } catch (e) {
      console.warn('Auth check:', e);
    }
  }

  // =========================================================================
  // 7. FORMULÁRIO: ADICIONAR ROTA
  // =========================================================================
  if (formEntregas) {
    formEntregas.addEventListener('submit', (e) => {
      e.preventDefault();
      const bairroInput = document.getElementById('bairro');
      const taxaInput = document.getElementById('taxa');

      const bairro = bairroInput.value.trim();
      const taxa = parseFloat(taxaInput.value.replace(',', '.'));

      if (!bairro || isNaN(taxa) || taxa <= 0) {
        alert('Informe o bairro e uma taxa válida!');
        return;
      }

      const novaRota = {
        id: 'rota_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        bairro,
        taxa,
        data: getDataHoje(),
        horario: getHoraAtual(),
        createdAt: Date.now()
      };

      rotas.unshift(novaRota);
      salvarCacheLocal();
      renderizarHistorico();

      bairroInput.value = '';
      taxaInput.value = '';

      if (typeof firebase !== 'undefined' && firebase.firestore && usuarioId && !usuarioId.startsWith('local')) {
        try {
          firebase.firestore().collection('users').doc(usuarioId).collection('rotas').doc(novaRota.id).set(novaRota);
        } catch (err) {
          console.warn('Aviso ao sincronizar no Firestore:', err);
        }
      }
    });
  }

  // =========================================================================
  // 8. FORMULÁRIO: ADICIONAR GASTO
  // =========================================================================
  if (formGastos) {
    formGastos.addEventListener('submit', (e) => {
      e.preventDefault();
      const descricaoInput = document.getElementById('descricao');
      const valorGastoInput = document.getElementById('valor-gasto');

      const descricao = descricaoInput.value.trim();
      const valor = parseFloat(valorGastoInput.value.replace(',', '.'));

      if (!descricao || isNaN(valor) || valor <= 0) {
        alert('Informe a descrição e um valor de gasto válido!');
        return;
      }

      const novoGasto = {
        id: 'gasto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        descricao,
        valor,
        data: getDataHoje(),
        horario: getHoraAtual(),
        createdAt: Date.now()
      };

      gastos.unshift(novoGasto);
      salvarCacheLocal();
      renderizarHistorico();

      descricaoInput.value = '';
      valorGastoInput.value = '';

      if (typeof firebase !== 'undefined' && firebase.firestore && usuarioId && !usuarioId.startsWith('local')) {
        try {
          firebase.firestore().collection('users').doc(usuarioId).collection('gastos').doc(novoGasto.id).set(novoGasto);
        } catch (err) {
          console.warn('Aviso ao sincronizar no Firestore:', err);
        }
      }
    });
  }
});