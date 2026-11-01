// Regras da escola usadas na lista e no popup.
import { dataCurta } from '../../lib/formato';
import type { Escola } from '../../types';

export type Situacao = 'teste' | 'ativo' | 'bloqueada' | 'desativada';

// situação do plano, para o filtro e a etiqueta: teste, ativo, bloqueada (o teste acabou) ou desativada
export function situacaoDe(e: Escola): Situacao {
  if (!e.ativa) return 'desativada';
  if (e.plano === 'ativo') return 'ativo';
  return e.bloqueada ? 'bloqueada' : 'teste';
}

export const SITUACOES: { valor: Situacao; rotulo: string; cor: 'success' | 'warning' | 'error' | 'default' }[] = [
  { valor: 'ativo', rotulo: 'Plano ativo', cor: 'success' },
  { valor: 'teste', rotulo: 'Em teste', cor: 'warning' },
  { valor: 'bloqueada', rotulo: 'Teste acabou', cor: 'error' },
  { valor: 'desativada', rotulo: 'Desativadas', cor: 'default' },
];

export function textoSituacao(e: Escola) {
  const s = situacaoDe(e);
  if (s === 'ativo') return 'Plano ativo';
  if (s === 'desativada') return 'Desativada';
  if (s === 'bloqueada') return `Teste acabou em ${dataCurta(e.teste_ate)}`;
  const dias = Math.max(0, Math.ceil((new Date(e.teste_ate!).getTime() - Date.now()) / 864e5));
  return `Teste: ${dias === 0 ? 'acaba hoje' : dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`}`;
}

// o endereço da escola: /<escola> no próprio domínio (o nginx entende, no computador e na VPS)
export const linkDaEscola = (slug: string) => `${location.origin}/${slug}`;

export const slugValido = (slug: string) => /^[A-Za-z0-9_-]{3,40}$/.test(slug);

// sugestão de endereço a partir do nome: "Colégio São José" → "colegioSaoJose"
export function sugerirSlug(nome: string) {
  const palavras = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return palavras.map((p, i) => (i === 0 ? p.toLowerCase() : p[0].toUpperCase() + p.slice(1).toLowerCase())).join('').slice(0, 40);
}

// o logo vira uma imagem pequena (até 240 px) guardada no banco, como no app antigo
export function reduzirLogo(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onerror = () => rejeitar(new Error('Não deu para ler a imagem.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => rejeitar(new Error('Esse arquivo não é uma imagem.'));
      img.onload = () => {
        const escala = Math.min(1, 240 / Math.max(img.width, img.height));
        const tela = document.createElement('canvas');
        tela.width = Math.round(img.width * escala);
        tela.height = Math.round(img.height * escala);
        tela.getContext('2d')!.drawImage(img, 0, 0, tela.width, tela.height);
        let url = tela.toDataURL('image/png');
        if (url.length > 45000) url = tela.toDataURL('image/webp', 0.85);
        if (url.length > 45000) url = tela.toDataURL('image/jpeg', 0.8);
        resolver(url);
      };
      img.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  });
}
