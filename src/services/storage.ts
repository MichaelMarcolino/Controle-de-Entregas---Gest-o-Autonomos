import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Rota, Gasto, ResumoEstatisticas } from '../types';

// Helper to format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Helper to get today's date in YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get current time HH:mm
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Local storage keys
const getStorageKey = (prefix: string, userId: string) => `scge_${prefix}_${userId}`;

// Seed initial demonstrative data if user is brand new
export function getInitialSeedData(userId: string): { rotas: Rota[]; gastos: Gasto[] } {
  const today = getTodayDateString();
  const sampleRotas: Rota[] = [
    {
      id: 'seed-r1',
      bairro: 'Centro - Rua das Flores',
      taxa: 14.50,
      formaPagamento: 'pix',
      status: 'concluida',
      observacao: 'Entrega rápida iFood',
      data: today,
      horario: '11:40',
      userId,
      createdAt: Date.now() - 1000 * 60 * 180
    },
    {
      id: 'seed-r2',
      bairro: 'Jardim América',
      taxa: 18.00,
      formaPagamento: 'dinheiro',
      status: 'concluida',
      observacao: 'Troco para R$ 50',
      data: today,
      horario: '12:25',
      userId,
      createdAt: Date.now() - 1000 * 60 * 120
    },
    {
      id: 'seed-r3',
      bairro: 'Vila Mariana',
      taxa: 12.00,
      formaPagamento: 'cartao',
      status: 'concluida',
      observacao: 'Maquininha pronta',
      data: today,
      horario: '13:10',
      userId,
      createdAt: Date.now() - 1000 * 60 * 60
    }
  ];

  const sampleGastos: Gasto[] = [
    {
      id: 'seed-g1',
      descricao: 'Gasolina Posto Shell',
      valor: 25.00,
      categoria: 'gasolina',
      data: today,
      horario: '10:30',
      userId,
      createdAt: Date.now() - 1000 * 60 * 240
    },
    {
      id: 'seed-g2',
      descricao: 'Almoço / Lanche da tarde',
      valor: 15.00,
      categoria: 'alimentacao',
      data: today,
      horario: '13:40',
      userId,
      createdAt: Date.now() - 1000 * 60 * 30
    }
  ];

  return { rotas: sampleRotas, gastos: sampleGastos };
}

// Read from localStorage cache
export function getCachedRotas(userId: string): Rota[] {
  try {
    const raw = localStorage.getItem(getStorageKey('rotas', userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Erro ao ler cache local de rotas:', err);
  }
  return [];
}

export function saveCachedRotas(userId: string, rotas: Rota[]): void {
  try {
    localStorage.setItem(getStorageKey('rotas', userId), JSON.stringify(rotas));
  } catch (err) {
    console.warn('Erro ao salvar cache local de rotas:', err);
  }
}

export function getCachedGastos(userId: string): Gasto[] {
  try {
    const raw = localStorage.getItem(getStorageKey('gastos', userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Erro ao ler cache local de gastos:', err);
  }
  return [];
}

export function saveCachedGastos(userId: string, gastos: Gasto[]): void {
  try {
    localStorage.setItem(getStorageKey('gastos', userId), JSON.stringify(gastos));
  } catch (err) {
    console.warn('Erro ao salvar cache local de gastos:', err);
  }
}

// Subscribe to Rotas in Firestore with LocalStorage Fallback & Sync
export function subscribeToRotas(
  userId: string, 
  onUpdate: (rotas: Rota[]) => void, 
  onError?: (error: Error) => void
): () => void {
  // Always immediately provide cached data
  const cached = getCachedRotas(userId);
  if (cached.length > 0) {
    onUpdate(cached);
  }

  // If userId is guest, solely use localStorage
  if (userId.startsWith('guest_') || !userId) {
    if (cached.length === 0) {
      const seed = getInitialSeedData(userId);
      saveCachedRotas(userId, seed.rotas);
      onUpdate(seed.rotas);
    }
    return () => {};
  }

  try {
    const rotasCol = collection(db, 'users', userId, 'rotas');
    const q = query(rotasCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreRotas: Rota[] = [];
        snapshot.forEach((doc) => {
          firestoreRotas.push(doc.data() as Rota);
        });

        // If firestore returned records, sync cache and update
        if (firestoreRotas.length > 0 || snapshot.metadata.fromCache) {
          saveCachedRotas(userId, firestoreRotas);
          onUpdate(firestoreRotas);
        } else if (cached.length > 0) {
          // If Firestore is empty but we had cached items, push cached items to Firestore
          onUpdate(cached);
          cached.forEach(rota => {
            saveRota(rota).catch(console.error);
          });
        } else {
          // Both are empty, check if first time
          const seed = getInitialSeedData(userId);
          saveCachedRotas(userId, seed.rotas);
          onUpdate(seed.rotas);
          seed.rotas.forEach(r => saveRota(r).catch(console.error));
        }
      },
      (error) => {
        console.warn('Aviso: Firestore rotas offline ou permissão pendente. Usando armazenamento local resiliente:', error.message);
        const fallback = getCachedRotas(userId);
        if (fallback.length === 0) {
          const seed = getInitialSeedData(userId);
          saveCachedRotas(userId, seed.rotas);
          onUpdate(seed.rotas);
        } else {
          onUpdate(fallback);
        }
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('Erro ao configurar listener do Firestore:', err);
    return () => {};
  }
}

// Subscribe to Gastos in Firestore with LocalStorage Fallback & Sync
export function subscribeToGastos(
  userId: string, 
  onUpdate: (gastos: Gasto[]) => void, 
  onError?: (error: Error) => void
): () => void {
  const cached = getCachedGastos(userId);
  if (cached.length > 0) {
    onUpdate(cached);
  }

  if (userId.startsWith('guest_') || !userId) {
    if (cached.length === 0) {
      const seed = getInitialSeedData(userId);
      saveCachedGastos(userId, seed.gastos);
      onUpdate(seed.gastos);
    }
    return () => {};
  }

  try {
    const gastosCol = collection(db, 'users', userId, 'gastos');
    const q = query(gastosCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreGastos: Gasto[] = [];
        snapshot.forEach((doc) => {
          firestoreGastos.push(doc.data() as Gasto);
        });

        if (firestoreGastos.length > 0 || snapshot.metadata.fromCache) {
          saveCachedGastos(userId, firestoreGastos);
          onUpdate(firestoreGastos);
        } else if (cached.length > 0) {
          onUpdate(cached);
          cached.forEach(gasto => {
            saveGasto(gasto).catch(console.error);
          });
        } else {
          const seed = getInitialSeedData(userId);
          saveCachedGastos(userId, seed.gastos);
          onUpdate(seed.gastos);
          seed.gastos.forEach(g => saveGasto(g).catch(console.error));
        }
      },
      (error) => {
        console.warn('Aviso: Firestore gastos offline ou permissão pendente. Usando armazenamento local resiliente:', error.message);
        const fallback = getCachedGastos(userId);
        if (fallback.length === 0) {
          const seed = getInitialSeedData(userId);
          saveCachedGastos(userId, seed.gastos);
          onUpdate(seed.gastos);
        } else {
          onUpdate(fallback);
        }
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('Erro ao configurar listener do Firestore para gastos:', err);
    return () => {};
  }
}

// Save Rota
export async function saveRota(rota: Rota): Promise<void> {
  // Update local cache immediately
  const cached = getCachedRotas(rota.userId);
  const existingIdx = cached.findIndex(r => r.id === rota.id);
  let updated: Rota[];
  if (existingIdx >= 0) {
    updated = [...cached];
    updated[existingIdx] = rota;
  } else {
    updated = [rota, ...cached];
  }
  saveCachedRotas(rota.userId, updated);

  if (rota.userId.startsWith('guest_')) {
    return;
  }

  try {
    const docRef = doc(db, 'users', rota.userId, 'rotas', rota.id);
    await setDoc(docRef, rota, { merge: true });
  } catch (err) {
    console.warn('Firestore setDoc rota aviso:', err);
  }
}

// Delete Rota
export async function deleteRota(userId: string, rotaId: string): Promise<void> {
  const cached = getCachedRotas(userId);
  const updated = cached.filter(r => r.id !== rotaId);
  saveCachedRotas(userId, updated);

  if (userId.startsWith('guest_')) {
    return;
  }

  try {
    const docRef = doc(db, 'users', userId, 'rotas', rotaId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteDoc rota aviso:', err);
  }
}

// Save Gasto
export async function saveGasto(gasto: Gasto): Promise<void> {
  const cached = getCachedGastos(gasto.userId);
  const existingIdx = cached.findIndex(g => g.id === gasto.id);
  let updated: Gasto[];
  if (existingIdx >= 0) {
    updated = [...cached];
    updated[existingIdx] = gasto;
  } else {
    updated = [gasto, ...cached];
  }
  saveCachedGastos(gasto.userId, updated);

  if (gasto.userId.startsWith('guest_')) {
    return;
  }

  try {
    const docRef = doc(db, 'users', gasto.userId, 'gastos', gasto.id);
    await setDoc(docRef, gasto, { merge: true });
  } catch (err) {
    console.warn('Firestore setDoc gasto aviso:', err);
  }
}

// Delete Gasto
export async function deleteGasto(userId: string, gastoId: string): Promise<void> {
  const cached = getCachedGastos(userId);
  const updated = cached.filter(g => g.id !== gastoId);
  saveCachedGastos(userId, updated);

  if (userId.startsWith('guest_')) {
    return;
  }

  try {
    const docRef = doc(db, 'users', userId, 'gastos', gastoId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteDoc gasto aviso:', err);
  }
}

// Calculate summary statistics
export function calcularResumo(rotas: Rota[], gastos: Gasto[]): ResumoEstatisticas {
  const totalFaturado = rotas.reduce((acc, r) => acc + (r.status !== 'cancelada' ? r.taxa : 0), 0);
  const totalGastos = gastos.reduce((acc, g) => acc + g.valor, 0);
  const saldoLiquido = totalFaturado - totalGastos;
  const qtdRotas = rotas.filter(r => r.status !== 'cancelada').length;
  const mediaPorRota = qtdRotas > 0 ? totalFaturado / qtdRotas : 0;

  const porPagamento: Record<Rota['formaPagamento'], number> = {
    pix: 0,
    dinheiro: 0,
    cartao: 0,
    outros: 0
  };

  rotas.forEach(r => {
    if (r.status !== 'cancelada') {
      porPagamento[r.formaPagamento] = (porPagamento[r.formaPagamento] || 0) + r.taxa;
    }
  });

  const porCategoriaGasto: Record<Gasto['categoria'], number> = {
    gasolina: 0,
    alimentacao: 0,
    manutencao: 0,
    oleo: 0,
    multa: 0,
    outros: 0
  };

  gastos.forEach(g => {
    porCategoriaGasto[g.categoria] = (porCategoriaGasto[g.categoria] || 0) + g.valor;
  });

  return {
    totalFaturado,
    totalGastos,
    saldoLiquido,
    qtdRotas,
    mediaPorRota,
    porPagamento,
    porCategoriaGasto
  };
}
