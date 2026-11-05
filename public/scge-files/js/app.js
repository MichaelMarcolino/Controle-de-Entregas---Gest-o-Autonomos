// Módulo do Dashboard para dashboard.html
import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Formatação monetária
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

// Data e hora de hoje
function getDataHoje() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function getHoraAtual() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Elementos da interface
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

// Estado em memória
let rotas = [];
let gastos = [];
let usuarioId = null;

// =========================================================================
// CORREÇÃO 1: BOTÃO SAIR (Desconecta e redireciona garantidamente para index)
// =========================================================================
if (btnSair) {
  btnSair.addEventListener('click', async () => {
    btnSair.textContent = 'Saindo...';
    try {
      localStorage.removeItem('scge_guest_session');
      await signOut(auth);
    } catch (err) {
      console.warn('Aviso durante signOut:', err);
    } finally {
      // Redireciona sempre para o index.html sem erro
      window.location.href = 'index.html';
    }
  });
}

// =========================================================================
// NAVEGAÇÃO ENTRE ABAS
// =========================================================================
function alternarAba(aba) {
  if (aba === 'lancamentos') {
    tabLancamentos.classList.add('active');
    tabHistorico.classList.remove('active');
    viewLancamentos.style.display = 'block';
    viewHistorico.style.display = 'none';
  } else {
    tabHistorico.classList.add('active');
    tabLancamentos.classList.remove('active');
    viewLancamentos.style.display = 'none';
    viewHistorico.style.display = 'block';
    renderizarHistorico();
  }
}

if (tabLancamentos) tabLancamentos.addEventListener('click', () => alternarAba('lancamentos'));
if (tabHistorico) tabHistorico.addEventListener('click', () => alternarAba('historico'));
if (btnVoltarHoje) btnVoltarHoje.addEventListener('click', () => alternarAba('lancamentos'));

// =========================================================================
// ARMAZENAMENTO E SINCRONIZAÇÃO LOCAL + FIRESTORE
// =========================================================================
function getStorageKey(prefix) {
  return `scge_${prefix}_${usuarioId}`;
}

function carregarCacheLocal() {
  try {
    const rotasCache = localStorage.getItem(getStorageKey('rotas'));
    if (rotasCache) rotas = JSON.parse(rotasCache);

    const gastosCache = localStorage.getItem(getStorageKey('gastos'));
    if (gastosCache) gastos = JSON.parse(gastosCache);
  } catch (e) {
    console.warn('Erro ao carregar cache:', e);
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
// RENDERIZAÇÃO DO HISTÓRICO E RESUMO GERAL
// =========================================================================
function renderizarHistorico() {
  if (!listaRotas || !listaGastos || !resumoValores) return;

  // Renderizar Rotas
  if (rotas.length === 0) {
    listaRotas.innerHTML = '<li style="text-align:center; padding: 25px; color: #94a3b8;">Nenhuma rota cadastrada ainda.</li>';
  } else {
    listaRotas.innerHTML = rotas.map(r => `
      <li class="item-historico">
        <div class="item-info">
          <strong>${r.bairro}</strong>
          <span>📅 ${r.data.split('-').reverse().join('/')} às ${r.horario || '--:--'}</span>
        </div>
        <div class="item-valor">
          <span class="valor-positivo">+${formatarMoeda(r.taxa)}</span>
          <button class="btn-excluir" onclick="window.excluirRota('${r.id}')" title="Excluir rota">🗑️</button>
        </div>
      </li>
    `).join('');
  }

  // Renderizar Gastos
  if (gastos.length === 0) {
    listaGastos.innerHTML = '<li style="text-align:center; padding: 25px; color: #94a3b8;">Nenhum gasto cadastrado ainda.</li>';
  } else {
    listaGastos.innerHTML = gastos.map(g => `
      <li class="item-historico">
        <div class="item-info">
          <strong>${g.descricao}</strong>
          <span>📅 ${g.data.split('-').reverse().join('/')} às ${g.horario || '--:--'}</span>
        </div>
        <div class="item-valor">
          <span class="valor-negativo">-${formatarMoeda(g.valor)}</span>
          <button class="btn-excluir" onclick="window.excluirGasto('${g.id}')" title="Excluir gasto">🗑️</button>
        </div>
      </li>
    `).join('');
  }

  // Calcular Resumo
  const totalFaturado = rotas.reduce((acc, r) => acc + (parseFloat(r.taxa) || 0), 0);
  const totalGastos = gastos.reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);
  const saldoLiquido = totalFaturado - totalGastos;
  const qtdRotas = rotas.length;
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

// Expor exclusões no window
window.excluirRota = async function(id) {
  if (confirm('Deseja realmente remover esta rota do histórico?')) {
    rotas = rotas.filter(r => r.id !== id);
    salvarCacheLocal();
    renderizarHistorico();

    if (usuarioId && !usuarioId.startsWith('guest_')) {
      try {
        await deleteDoc(doc(db, 'users', usuarioId, 'rotas', id));
      } catch (e) {
        console.warn('Erro ao deletar no Firestore:', e);
      }
    }
  }
};

window.excluirGasto = async function(id) {
  if (confirm('Deseja realmente remover este gasto do histórico?')) {
    gastos = gastos.filter(g => g.id !== id);
    salvarCacheLocal();
    renderizarHistorico();

    if (usuarioId && !usuarioId.startsWith('guest_')) {
      try {
        await deleteDoc(doc(db, 'users', usuarioId, 'gastos', id));
      } catch (e) {
        console.warn('Erro ao deletar no Firestore:', e);
      }
    }
  }
};

// =========================================================================
// CORREÇÃO 2: CARREGAMENTO CORRETO DO HISTÓRICO COM onAuthStateChanged
// =========================================================================
onAuthStateChanged(auth, (user) => {
  const guestSession = localStorage.getItem('scge_guest_session');

  if (!user && !guestSession) {
    // Se não estiver logado, redireciona ao login
    window.location.href = 'index.html';
    return;
  }

  usuarioId = user ? user.uid : 'guest_local';
  carregarCacheLocal();
  renderizarHistorico();

  // Se estiver conectado via Firebase, inicia listeners em tempo real
  if (user) {
    try {
      // Listener de Rotas (subcoleção 'users/{uid}/rotas')
      const rotasRef = collection(db, 'users', usuarioId, 'rotas');
      const qRotas = query(rotasRef, orderBy('createdAt', 'desc'));

      onSnapshot(qRotas, (snapshot) => {
        const firestoreRotas = [];
        snapshot.forEach((docSnap) => {
          firestoreRotas.push(docSnap.data());
        });

        if (firestoreRotas.length > 0) {
          rotas = firestoreRotas;
          salvarCacheLocal();
          renderizarHistorico();
        }
      }, (err) => {
        console.warn('Firestore offline ou permissão pendente. Utilizando armazenamento local seguro:', err.message);
      });

      // Listener de Gastos (subcoleção 'users/{uid}/gastos')
      const gastosRef = collection(db, 'users', usuarioId, 'gastos');
      const qGastos = query(gastosRef, orderBy('createdAt', 'desc'));

      onSnapshot(qGastos, (snapshot) => {
        const firestoreGastos = [];
        snapshot.forEach((docSnap) => {
          firestoreGastos.push(docSnap.data());
        });

        if (firestoreGastos.length > 0) {
          gastos = firestoreGastos;
          salvarCacheLocal();
          renderizarHistorico();
        }
      }, (err) => {
        console.warn('Firestore offline ou permissão pendente:', err.message);
      });

    } catch (e) {
      console.warn('Erro ao conectar listeners:', e);
    }
  }
});

// =========================================================================
// FORMULÁRIO 1: ADICIONAR ROTA
// =========================================================================
if (formEntregas) {
  formEntregas.addEventListener('submit', async (e) => {
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

    // Salva no Firestore
    if (usuarioId && !usuarioId.startsWith('guest_')) {
      try {
        await setDoc(doc(db, 'users', usuarioId, 'rotas', novaRota.id), novaRota);
      } catch (err) {
        console.warn('Aviso ao sincronizar no Firestore:', err);
      }
    }

    alert(`✅ Rota "${bairro}" adicionada com sucesso!`);
  });
}

// =========================================================================
// FORMULÁRIO 2: ADICIONAR GASTO
// =========================================================================
if (formGastos) {
  formGastos.addEventListener('submit', async (e) => {
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

    // Salva no Firestore
    if (usuarioId && !usuarioId.startsWith('guest_')) {
      try {
        await setDoc(doc(db, 'users', usuarioId, 'gastos', novoGasto.id), novoGasto);
      } catch (err) {
        console.warn('Aviso ao sincronizar no Firestore:', err);
      }
    }

    alert(`✅ Gasto "${descricao}" de ${formatarMoeda(valor)} registrado com sucesso!`);
  });
}
