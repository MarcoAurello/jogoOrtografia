/* Davi Miguel, o personagem guia — desenhado em SVG (sem foto).
   Cabelo castanho-escuro com franjinha caída de lado, olhos castanhos,
   sorrisão com as janelinhas nos dentes e o uniforme do Colégio Pleno:
   blusa cinza e calça roxa.
   humor: 'oi' (acenando), 'feliz', 'pensando', 'festa' (braços para cima) */
function daviSVG(humor = 'feliz') {
  const pele = '#e9b48c', peleSombra = '#d49670', peleLuz = '#f3c9a6';
  const cabelo = '#3a2417', cabeloMeio = '#4e3120', cabeloBrilho = '#6e4a32';
  const iris = '#5a3820', contorno = '#2a1a10';
  const blusa = '#a7abb0', blusaSombra = '#8d9196';
  const calca = '#a2238e', calcaSombra = '#7f1a70';

  // braços: um acena no "oi"; os dois sobem na "festa"
  const bracoBaixo = (lado) => {
    const x = lado < 0 ? 44 : 156;
    return `<path d="M${x} 150 Q${x + lado * 10} 190 ${x + lado * 4} 222" stroke="${pele}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <circle cx="${x + lado * 4}" cy="224" r="11" fill="${pele}"/>`;
  };
  const bracoCima = (lado) => {
    const x = lado < 0 ? 44 : 156;
    return `<path d="M${x} 152 Q${x + lado * 22} 120 ${x + lado * 18} 88" stroke="${pele}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <circle cx="${x + lado * 18}" cy="84" r="12" fill="${pele}"/>`;
  };
  const bracos = humor === 'festa' ? bracoCima(-1) + bracoCima(1)
    : humor === 'oi' ? bracoBaixo(-1) + `<g class="davi-aceno">${bracoCima(1)}</g>`
    : bracoBaixo(-1) + bracoBaixo(1);

  // olho castanho grande (dx/dy: para onde ele olha)
  const olho = (cx, dx = 0, dy = 0) => `
    <ellipse cx="${cx}" cy="93" rx="10" ry="8.5" fill="#fff"/>
    <circle cx="${cx + dx}" cy="${93 + dy}" r="6.2" fill="${iris}"/>
    <circle cx="${cx + dx}" cy="${93 + dy}" r="3" fill="${contorno}"/>
    <circle cx="${cx + dx + 2}" cy="${91 + dy}" r="1.9" fill="#fff"/>
    <path d="M${cx - 10.5} 91 Q${cx} 76 ${cx + 10.5} 91" stroke="${contorno}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

  // olhos sorrindo (feliz) ou abertos
  const olhos = humor === 'feliz' || humor === 'festa'
    ? `<path d="M72 95 Q82 85 92 95" stroke="${contorno}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
       <path d="M108 95 Q118 85 128 95" stroke="${contorno}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
       <path d="M74 99 Q82 103 90 99 M110 99 Q118 103 126 99" stroke="${peleSombra}" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : humor === 'pensando' ? olho(82, 3, -2) + olho(118, 3, -2)
      : olho(82, 1) + olho(118, 1);

  const sobrancelhas = humor === 'pensando'
    ? `<path d="M71 79 Q82 74 92 78" stroke="${cabelo}" stroke-width="4" fill="none" stroke-linecap="round"/>
       <path d="M108 75 Q118 71 129 76" stroke="${cabelo}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<path d="M71 80 Q82 75 92 79" stroke="${cabelo}" stroke-width="4" fill="none" stroke-linecap="round"/>
       <path d="M108 79 Q118 75 129 80" stroke="${cabelo}" stroke-width="4" fill="none" stroke-linecap="round"/>`;

  // boca: sorrisão aberto mostrando os dentinhos, com as janelinhas
  const dentes = [[79, 6], [86, 6], [100, 7], [108, 6], [115, 6]]   // o vão em 93 é a janelinha
    .map(([x, w]) => `<rect x="${x}" y="110" width="${w}" height="${x === 100 ? 6 : 5}" rx="1.4" fill="#fff"/>`).join('');
  const boca = humor === 'pensando'
    ? `<path d="M88 117 Q100 113 112 118" stroke="#7a2a2a" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<path d="M74 108 Q100 140 126 108 Q100 113 74 108 Z" fill="#6e2424"/>
       ${dentes}
       <path d="M88 127 Q100 133 112 127 Q100 123 88 127 Z" fill="#e8737a"/>`;

  return `<svg class="davi davi-${humor}" viewBox="0 -26 200 346" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Davi Miguel">
    <!-- sombra no chão -->
    <ellipse cx="100" cy="312" rx="62" ry="7" fill="rgba(0,0,0,.15)"/>
    <!-- tênis -->
    <ellipse cx="76" cy="304" rx="22" ry="10" fill="#2a2a33"/><ellipse cx="124" cy="304" rx="22" ry="10" fill="#2a2a33"/>
    <rect x="58" y="300" width="36" height="5" rx="2" fill="#fff" opacity=".8"/><rect x="106" y="300" width="36" height="5" rx="2" fill="#fff" opacity=".8"/>
    <!-- calça roxa do uniforme -->
    <path d="M60 214 H140 L136 300 H106 L100 246 L94 300 H64 Z" fill="${calca}"/>
    <path d="M100 246 L94 300 H86 L92 240 Z" fill="${calcaSombra}" opacity=".6"/>
    <rect x="60" y="212" width="80" height="10" rx="4" fill="${calcaSombra}"/>
    <!-- braços (atrás da blusa) -->
    ${bracos}
    <!-- blusa cinza do uniforme -->
    <path d="M54 150 Q58 136 80 132 H120 Q142 136 146 150 L150 172 L136 176 L136 220 H64 L64 176 L50 172 Z" fill="${blusa}"/>
    <path d="M64 196 H136 V220 H64 Z" fill="${blusaSombra}" opacity=".35"/>
    <path d="M86 132 Q100 144 114 132" stroke="${blusaSombra}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- logo do colégio no peito -->
    <g transform="translate(118 160)">
      <circle cx="-5" cy="0" r="7" fill="#f7df1c"/><circle cx="5" cy="0" r="7" fill="#0095d9"/><circle cx="0" cy="4" r="7" fill="#a2238e"/>
    </g>
    <!-- pescoço -->
    <rect x="88" y="122" width="24" height="16" rx="6" fill="${peleSombra}"/>
    <!-- cabeça grande (estilo desenho infantil) -->
    <g transform="translate(100 84) scale(1.26) translate(-100 -88)">
      <!-- cabelo de trás (volume) -->
      <path d="M44 90 Q38 46 70 30 Q100 16 132 30 Q164 46 156 90 Z" fill="${cabelo}"/>
      <!-- orelhas -->
      <ellipse cx="48" cy="95" rx="10" ry="12" fill="${pele}"/><ellipse cx="152" cy="95" rx="10" ry="12" fill="${pele}"/>
      <ellipse cx="49" cy="95" rx="4.5" ry="6" fill="${peleSombra}"/><ellipse cx="151" cy="95" rx="4.5" ry="6" fill="${peleSombra}"/>
      <!-- rosto redondinho -->
      <path d="M50 86 Q50 40 100 40 Q150 40 150 86 Q150 120 128 132 Q114 140 100 140 Q86 140 72 132 Q50 120 50 86 Z" fill="${pele}"/>
      <ellipse cx="100" cy="64" rx="30" ry="14" fill="${peleLuz}" opacity=".45"/>
      <!-- franjinha castanha caída de lado -->
      <path d="M46 84 Q42 44 74 32 Q104 20 134 34 Q158 46 155 80 Q150 64 140 58 Q136 68 126 64 Q122 74 110 70 Q104 78 94 72 Q86 80 78 72 Q68 78 62 70 Q54 74 50 86 Z" fill="${cabeloMeio}"/>
      <path d="M58 52 Q80 34 110 36 M70 62 Q92 44 124 46 M100 30 Q124 30 142 46" stroke="${cabeloBrilho}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
      <path d="M110 70 Q118 58 126 64 M94 72 Q100 60 110 70 M78 72 Q84 62 94 72" stroke="${cabelo}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      ${sobrancelhas}
      ${olhos}
      <!-- bochechas e nariz -->
      <circle cx="68" cy="108" r="7" fill="#ff8f8f" opacity=".35"/><circle cx="132" cy="108" r="7" fill="#ff8f8f" opacity=".35"/>
      <path d="M96 99 Q100 106 105 100" stroke="${peleSombra}" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${boca}
    </g>
  </svg>`;
}
