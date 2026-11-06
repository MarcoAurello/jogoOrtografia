// O menu de cada perfil (o mesmo da Área do professor de hoje). A tela só esconde: quem decide a permissão é a API.
import type { Perfil, Usuario } from '../types';

export interface ItemMenu {
  caminho: string;
  titulo: string;
  icone: string;
  perfis: Perfil[];
  soSemEscola?: Perfil;   // este perfil só vê o item se não tiver escola (ex.: o professor avulso)
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
  // família: o link de cadastro e o que a família vê; a coordenação cuida da escola, o professor avulso dos pacientes dele
  { caminho: '/familias', titulo: 'Família', icone: '👨‍👩‍👧', perfis: ESCOLA, soSemEscola: 'professor' },
  // o catálogo dos jogos vale para todos (não depende de escola)
  { caminho: '/jogos', titulo: 'Jogos', icone: '🎮', perfis: ['admin', 'coordenacao', 'professor'] },
];

export const itensDoPerfil = (usuario: Usuario) =>
  ITENS_MENU.filter((i) => i.perfis.includes(usuario.perfil) && !(i.soSemEscola === usuario.perfil && usuario.escola));

export const NOME_DO_PERFIL: Record<Perfil, string> = {
  admin: 'Administrador',
  coordenacao: 'Coordenação',
  professor: 'Professor',
  responsavel: 'Responsável',
};
