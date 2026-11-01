// Regras e listas do plano de objetivos (as mesmas do app antigo, js/planos.js, e da API, PlanoController).
import type { Objetivo, StatusPlano } from '../../../types';

export const STATUS_PLANO: Record<StatusPlano, { rotulo: string; cor: 'default' | 'primary' | 'success' }> = {
  elaboracao: { rotulo: 'Em elaboração', cor: 'default' },
  ativo: { rotulo: 'Ativo', cor: 'primary' },
  concluido: { rotulo: 'Concluído', cor: 'success' },
};

export const DIAS: [string, string][] = [['seg', 'Seg'], ['ter', 'Ter'], ['qua', 'Qua'], ['qui', 'Qui'], ['sex', 'Sex'], ['sab', 'Sáb'], ['dom', 'Dom']];

export const AREAS = ['Funções executivas', 'Leitura e escrita', 'Raciocínio lógico-matemático', 'Socioemocional', 'Motricidade',
  'Autonomia', 'Atenção e concentração', 'Memória', 'Linguagem oral', 'Percepção visual e espacial'];

export const ADEQUACOES = ['Mais tempo nas avaliações', 'Sentar perto do professor', 'Instruções curtas, uma de cada vez', 'Uso de material concreto',
  'Avaliação oral quando possível', 'Pausas durante as atividades', 'Reforço positivo frequente', 'Menos estímulos visuais no material',
  'Leitura das questões em voz alta', 'Agenda/rotina visual'];

export const MAX_OBJETIVOS = 30;

export const objetivoVazio = (): Objetivo => ({ area: '', descricao: '', habilidades: [], jogos: [], recursos: '', indicador: '', prazo: '', dias: [] });
