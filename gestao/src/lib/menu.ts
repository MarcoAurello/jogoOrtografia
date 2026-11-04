// O menu de cada perfil (o mesmo da Área do professor de hoje). A tela só esconde: quem decide a permissão é a API.
import type { Perfil } from '../types';

export interface ItemMenu {
  caminho: string;
  titulo: string;
  icone: string;
  perfis: Perfil[];
}

const ESCOLA: Perfil[] = ['coordenacao', 'professor'];

export const ITENS_MENU: ItemMenu[] = [
  { caminho: '/escolas', titulo: 'Escolas', icone: '🏫', perfis: ['admin'] },
  { caminho: '/usuarios', titulo: 'Usuários', icone: '👥', perfis: ['admin', 'coordenacao'] },
  { caminho: '/alunos', titulo: 'Alunos', icone: '🧒', perfis: ['admin'] },
  { caminho: '/testes', titulo: 'Testes grátis', icone: '🎁', perfis: ['admin'] },
  { caminho: '/turmas', titulo: 'Turmas', icone: '🎒', perfis: ESCOLA },
  { caminho: '/anamnese', titulo: 'Alunos e anamnese', icone: '📋', perfis: ESCOLA },
  { caminho: '/modelos-anamnese', titulo: 'Modelos de anamnese', icone: '🗂️', perfis: ESCOLA },
  { caminho: '/emails', titulo: 'E-mails', icone: '✉️', perfis: ESCOLA },
  { caminho: '/questionarios', titulo: 'Questionários', icone: '📝', perfis: ESCOLA },
  { caminho: '/competicoes', titulo: 'Competições', icone: '🏆', perfis: ESCOLA },
  { caminho: '/links', titulo: 'Links', icone: '🔗', perfis: ESCOLA },
  // o catálogo dos jogos vale para todos (não depende de escola)
  { caminho: '/jogos', titulo: 'Jogos', icone: '🎮', perfis: ['admin', 'coordenacao', 'professor'] },
];

export const itensDoPerfil = (perfil: Perfil) => ITENS_MENU.filter((i) => i.perfis.includes(perfil));

export const NOME_DO_PERFIL: Record<Perfil, string> = {
  admin: 'Administrador',
  coordenacao: 'Coordenação',
  professor: 'Professor',
};
