export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao' | 'outros';
export type CategoriaGasto = 'gasolina' | 'alimentacao' | 'manutencao' | 'oleo' | 'multa' | 'outros';
export type StatusEntrega = 'concluida' | 'pendente' | 'cancelada';

export interface Rota {
  id: string;
  bairro: string;
  taxa: number;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  formaPagamento: FormaPagamento;
  status: StatusEntrega;
  observacao?: string;
  userId: string;
  createdAt: number;
}

export interface Gasto {
  id: string;
  descricao: string;
  valor: number;
  categoria: CategoriaGasto;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  userId: string;
  createdAt: number;
}

export interface ResumoEstatisticas {
  totalFaturado: number;
  totalGastos: number;
  saldoLiquido: number;
  qtdRotas: number;
  mediaPorRota: number;
  porPagamento: Record<FormaPagamento, number>;
  porCategoriaGasto: Record<CategoriaGasto, number>;
}
