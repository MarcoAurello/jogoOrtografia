// Dados que o app dos jogos já tem em módulos sem tela (js/habilidades.js e js/dados-anamnese.js): a gestão carrega
// os mesmos arquivos do servidor, na hora que precisa. Assim o banco de perguntas, as habilidades e os jogos ficam
// num lugar só (quem mexer neles não precisa lembrar de copiar para cá).

export interface PerguntaDoBanco { texto: string; tipo: TipoPergunta; m: number[]; opcoes: string[] }
export interface SecaoDoBanco { secao: string; perguntas: PerguntaDoBanco[] }
export type TipoPergunta = 'curta' | 'longa' | 'simnao' | 'multipla' | 'varias' | 'escala';

interface ModuloBanco { BANCO_ANAMNESE: SecaoDoBanco[]; NOMES_MODELOS: Record<string, string> }
interface ModuloHabilidades {
  GRUPOS_HAB: { nome: string; itens: Record<string, string> }[];
  NOME_HAB: Record<string, string>;
  JOGOS_HAB: Record<string, { h: string[]; r: string }>;
  CARTAO_DO_JOGO: Record<string, string>;
  INDICACOES: Record<string, string>;
  INDICADO_PARA: Record<string, string[]>;
  NOME_DO_CARTAO_EXTERNO: Record<string, string>;
  jogosParaHabilidades: (h: string[]) => string[];
}

const carregar = <T>(caminho: string) => import(/* @vite-ignore */ caminho) as Promise<T>;

let banco: Promise<ModuloBanco> | null = null;
export const carregarBanco = () => (banco ??= carregar<ModuloBanco>('/js/dados-anamnese.js'));

let habilidades: Promise<ModuloHabilidades> | null = null;
export const carregarHabilidades = () => (habilidades ??= carregar<ModuloHabilidades>('/js/habilidades.js'));

// os nomes dos jogos (pelo id do link, o mesmo do plano e das competições). Ficam em js/professor.js junto com a tela,
// por isso a cópia: jogo novo no app → acrescentar aqui também.
export const NOME_DO_JOGO: Record<string, string> = {
  ortografia: 'Jogo de Ortografia', chuva: 'Chuva de Erros', matematica: 'Chuva de Matemática', tiro: 'Tiro Certo',
  peso: 'Peso Certo', reflexo: 'Jogo do Reflexo', reflexo2: 'Jogo do Reflexo Nível 2', rotina: 'Rotina Certa',
  fichas: 'Fichas Coloridas', escondida: 'Palavra Escondida', copia: 'Copie Certo', barcos: 'Barquinhos',
  giro: 'Giro Imaginário', hora: 'Jogo da Hora', somando: 'Somando Imagens', descobrir: 'Descobrindo o Peso',
  chaves: 'Chaves de Sobreposição', caminho: 'Caminho da Memória', taxi: 'Siga o Táxi', policia: 'Polícia e Ladrão',
  pontos: 'Ponto a Ponto', pixels: 'Quebra-Cabeça de Pixels', fracoes: 'Pizzaria das Frações', cores: 'Somando as Cores',
  lados: 'Esquerda e Direita', setas: 'Setas e Cores', vistas: 'De Lado e de Cima', dinos: 'Memória dos Dinossauros',
  pilhas: 'Pilhas de Cores',
  blocos: 'Conte os Blocos',
  lugar: 'Cada Coisa no Seu Lugar',
  malha: 'Caminho na Malha',
  fila: 'Jogo da Fila',
  loja: 'Jogo da Loja',
  palitos: 'Palitos Sobrepostos',
  bordas: 'Cores da Borda',
  cadeado: 'Chave e Cadeado',
  tatu: 'Caminho do Tatu',
  flores: 'Flores do Dado',
  bichos: 'Memória dos Bichos',
  intervalo: 'Quanto Tempo Passou?',
  fita: 'Metro, Centímetro e Milímetro',
  forma: 'Atenção à Forma', tabuada: 'Tetris da Tabuada', classes: 'Classes de Palavras', graficos: 'Jogo dos Gráficos',
  historia: 'Cronologia da História Brasileira',
  comercio: 'Conexão Global',
  cartografo: 'Cartógrafo do Vale',
  bip: 'Robô Bip',
  conjuntos: 'Universo dos Conjuntos',
};
export const nomeDoJogo = (id: string) => NOME_DO_JOGO[id] || id;
