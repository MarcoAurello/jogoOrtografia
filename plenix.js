/* Plenix, o mascote do Pleno — pixel art animada pela folha de sprites
   (assets/plenix/plenix_spritesheet_1x.png: 4 quadros de 40x50 por linha).
   linhas da folha: 0 andando · 1 festejando · 2 triste · 3 pensando
   estados usados no jogo:
     'oi'       andando (início, entrada, regras)
     'pensando' enquanto o aluno analisa a questão
     'acertou'  festejando
     'triste'   errou
     'festa'    fim da missão: festejando com confete */
function plenixHTML(estado = 'oi') {
  const confete = estado === 'festa'
    ? ['🎉', '⭐', '✨', '💛', '💙', '❤️'].map((e, i) => `<span class="px-brilho b${i}">${e}</span>`).join('')
    : '';
  return `<div class="plenix plenix-${estado}" role="img" aria-label="Plenix">
    <div class="plenix-sprite"></div>
    ${confete}
  </div>`;
}
