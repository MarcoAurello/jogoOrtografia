// senha provisória fácil de ditar: sem letras que se confundem (0/O, 1/l/I)
export const senhaAleatoria = () =>
  Array.from({ length: 10 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');

export const SENHA_MINIMA = 8;

export const textoDeAcesso = (nome: string, email: string, senha: string) =>
  `Olá, ${nome.split(' ')[0]}! Seu acesso à gestão dos Jogos Pedagógicos:\n` +
  `Endereço: ${location.origin}/gestao/\nE-mail: ${email}\nSenha provisória: ${senha}\n` +
  'No primeiro acesso, você cria a sua senha.';
