/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Universo dos Conjuntos: os objetos e as regras (conjuntos). */

// As regras são OBJETIVAS: dá para conferir olhando a figura (cor principal, tem rodas, é animal, voa, fica na água...).
// Nada de critério de opinião ("brinquedo", "item de praia"), que gera discussão (a boia é brinquedo?).
// Cada objeto lista só as regras a que pertence SEM DÚVIDA; objetos discutíveis ficaram de fora do banco
// (pato: vive na água? avião: tem rodas? tomate: é fruta?). Cor só vale quando a figura é de uma cor só, bem clara, e
// os objetos sem cor marcada não podem parecer de uma das 4 cores em nenhum aparelho (passarinho, borboleta, bicicleta
// e pizza mudam de cor conforme o sistema: saíram).
// A fruta também é comida: "fruta ⊂ comida" aparece no diagrama (um círculo dentro do outro).

export const REGRAS = {
  vermelho: { nome: 'Vermelhos', icone: '🔴', ser: 'é vermelho', regra: 'A cor principal da figura é vermelha.' },
  amarelo: { nome: 'Amarelos', icone: '🟡', ser: 'é amarelo', regra: 'A cor principal da figura é amarela.' },
  verde: { nome: 'Verdes', icone: '🟢', ser: 'é verde', regra: 'A cor principal da figura é verde.' },
  azul: { nome: 'Azuis', icone: '🔵', ser: 'é azul', regra: 'A cor principal da figura é azul.' },
  animal: { nome: 'Animais', icone: '🐾', ser: 'é animal', regra: 'Bichos: seres vivos que se mexem e comem.' },
  comida: { nome: 'Comidas', icone: '🍽️', ser: 'é comida', regra: 'Coisas que a gente come.' },
  fruta: { nome: 'Frutas', icone: '🍉', ser: 'é fruta', regra: 'Frutas (toda fruta também é comida).' },
  rodas: { nome: 'Têm rodas', icone: '🛞', ser: 'tem rodas', regra: 'Andam sobre rodas.' },
  voa: { nome: 'Voam', icone: '✈️', ser: 'voa', regra: 'Voam pelo ar sozinhos (com asas ou motor).' },
  agua: { nome: 'Na água', icone: '🌊', ser: 'fica na água', regra: 'Nadam ou navegam: vivem ou andam na água.' },
};

// objeto: nome, emoji e as regras a que pertence
export const OBJETOS = [
  // animais
  { id: 'peixe', nome: 'peixe', emoji: '🐟', em: ['animal', 'agua', 'azul'] },
  { id: 'baleia', nome: 'baleia', emoji: '🐳', em: ['animal', 'agua', 'azul'] },
  { id: 'golfinho', nome: 'golfinho', emoji: '🐬', em: ['animal', 'agua', 'azul'] },
  { id: 'coruja', nome: 'coruja', emoji: '🦉', em: ['animal', 'voa'] },
  { id: 'morcego', nome: 'morcego', emoji: '🦇', em: ['animal', 'voa'] },
  { id: 'pintinho', nome: 'pintinho', emoji: '🐤', em: ['animal', 'amarelo'] },
  { id: 'dinossauro', nome: 'dinossauro', emoji: '🦖', em: ['animal', 'verde'] },
  { id: 'cachorro', nome: 'cachorro', emoji: '🐶', em: ['animal'] },
  { id: 'elefante', nome: 'elefante', emoji: '🐘', em: ['animal'] },
  // plantas (não são comida, animal, rodas, voa nem água: entram só nas cores)
  { id: 'girassol', nome: 'girassol', emoji: '🌻', em: ['amarelo'] },
  { id: 'rosa', nome: 'rosa', emoji: '🌹', em: ['vermelho'] },
  { id: 'cacto', nome: 'cacto', emoji: '🌵', em: ['verde'] },
  { id: 'trevo', nome: 'trevo', emoji: '🍀', em: ['verde'] },
  // comidas e frutas
  { id: 'maca', nome: 'maçã', emoji: '🍎', em: ['comida', 'fruta', 'vermelho'] },
  { id: 'maca-verde', nome: 'maçã verde', emoji: '🍏', em: ['comida', 'fruta', 'verde'] },
  { id: 'morango', nome: 'morango', emoji: '🍓', em: ['comida', 'fruta', 'vermelho'] },
  { id: 'banana', nome: 'banana', emoji: '🍌', em: ['comida', 'fruta', 'amarelo'] },
  { id: 'limao', nome: 'limão-siciliano', emoji: '🍋', em: ['comida', 'fruta', 'amarelo'] },
  { id: 'mirtilo', nome: 'mirtilo', emoji: '🫐', em: ['comida', 'fruta', 'azul'] },
  { id: 'uva', nome: 'uva', emoji: '🍇', em: ['comida', 'fruta'] },
  { id: 'brocolis', nome: 'brócolis', emoji: '🥦', em: ['comida', 'verde'] },
  { id: 'pepino', nome: 'pepino', emoji: '🥒', em: ['comida', 'verde'] },
  { id: 'pimenta', nome: 'pimenta', emoji: '🌶️', em: ['comida', 'vermelho'] },
  { id: 'queijo', nome: 'queijo', emoji: '🧀', em: ['comida', 'amarelo'] },
  { id: 'pao', nome: 'pão', emoji: '🥖', em: ['comida'] },
  { id: 'biscoito', nome: 'biscoito', emoji: '🍪', em: ['comida'] },
  { id: 'bolo', nome: 'bolo', emoji: '🍰', em: ['comida'] },
  // veículos
  { id: 'carro', nome: 'carro', emoji: '🚗', em: ['rodas', 'vermelho'] },
  { id: 'bombeiros', nome: 'caminhão de bombeiros', emoji: '🚒', em: ['rodas', 'vermelho'] },
  { id: 'taxi', nome: 'táxi', emoji: '🚕', em: ['rodas', 'amarelo'] },
  { id: 'jipe', nome: 'jipe', emoji: '🚙', em: ['rodas', 'azul'] },
  { id: 'ambulancia', nome: 'ambulância', emoji: '🚑', em: ['rodas'] },
  { id: 'viatura', nome: 'carro de polícia', emoji: '🚓', em: ['rodas'] },
  { id: 'foguete', nome: 'foguete', emoji: '🚀', em: ['voa'] },
  { id: 'disco', nome: 'disco voador', emoji: '🛸', em: ['voa'] },
  { id: 'veleiro', nome: 'veleiro', emoji: '⛵', em: ['agua'] },
  { id: 'navio', nome: 'navio', emoji: '🚢', em: ['agua'] },
  // outros (em nenhuma regra: ficam fora de todos os círculos, a não ser pela cor)
  { id: 'estrela', nome: 'estrela', emoji: '⭐', em: ['amarelo'] },
  { id: 'bola', nome: 'bola de futebol', emoji: '⚽', em: [] },
  { id: 'livro', nome: 'livro', emoji: '📘', em: ['azul'] },
];
