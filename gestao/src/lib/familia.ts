// Os relatórios que a família pode ver (as chaves da escola, do professor avulso e a exceção na ficha do aluno).
// A API confere de verdade (familiaPodeVer em api/src/services/acessoAluno.ts); aqui ficam só os textos.
import type { RelatorioFamilia } from '../types';

export const RELATORIOS_FAMILIA: { chave: RelatorioFamilia; titulo: string; ligado: string; desligado: string }[] = [
  { chave: 'jogos', titulo: 'Jogos e desempenho',
    ligado: 'A família vê as partidas, o acerto e a evolução nos jogos.', desligado: 'A família não vê os jogos.' },
  { chave: 'recados', titulo: 'Recados para a família',
    ligado: 'A família lê os recados que a equipe escreve na ficha do aluno.', desligado: 'Os recados não aparecem para a família.' },
  { chave: 'plano', titulo: 'Plano de objetivos',
    ligado: 'A família vê os objetivos, os jogos indicados e as orientações para casa (sem rascunhos nem as adequações da escola).',
    desligado: 'A família não vê o plano de objetivos.' },
  { chave: 'anamnese', titulo: 'Anamnese (pareceres da equipe)',
    ligado: 'A família vê as anamneses que a equipe preencheu. As respostas que a própria família deu aparecem sempre.',
    desligado: 'Só as respostas que a própria família deu aparecem para ela.' },
];

// "Jogar": abre o app dos jogos (mesmo endereço, mesmo login) em "Quem vai jogar?"; com o id, já no PIN daquele filho.
// O token da conta é o mesmo do app (mesmo domínio): o app lê a lista dos filhos com ele (js/entrada.js, telaCasa).
export function jogarEmCasa(filhoId?: string) {
  window.location.href = `/?casa=${filhoId ? encodeURIComponent(filhoId) : 1}`;
}
