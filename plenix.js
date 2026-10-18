/* Plenix, o mascote do Pleno — imagem recortada (assets/plenix.png) + animações em CSS.
   estados:
     'oi'       acenando (início, regras)
     'pensando' enquanto o aluno analisa a questão (balança e solta "?")
     'acertou'  pula e comemora com estrelas
     'triste'   errou: fica cabisbaixo, com uma lágrima
     'festa'    fim da missão: pula sem parar com confete */
function plenixHTML(estado = 'oi') {
  const efeitos = {
    pensando: '<span class="px-duvida d1">?</span><span class="px-duvida d2">?</span><span class="px-duvida d3">?</span>',
    acertou: ['⭐', '✨', '⭐', '✨', '💜', '⭐'].map((e, i) => `<span class="px-brilho b${i}">${e}</span>`).join(''),
    triste: '<span class="px-lagrima"></span>',
    festa: ['🎉', '⭐', '✨', '💛', '💙', '💜'].map((e, i) => `<span class="px-brilho b${i}">${e}</span>`).join(''),
  };
  return `<div class="plenix plenix-${estado}" role="img" aria-label="Plenix">
    <img class="plenix-corpo" src="assets/plenix.png" alt="" draggable="false">
    ${efeitos[estado] || ''}
  </div>`;
}
