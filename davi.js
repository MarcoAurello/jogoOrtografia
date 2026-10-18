/* Davi, o personagem guia — desenhado em SVG (sem foto).
   Cabelo azul espetado, janelinha nos dentes
   e o uniforme do Colégio Pleno: blusa cinza e calça roxa.
   humor: 'oi' (acenando), 'feliz', 'pensando', 'festa' (braços para cima) */
function daviSVG(humor = 'feliz') {
  const pele = '#f2c4a0', peleSombra = '#e2a77f';
  const cabelo = '#1d3a78', cabeloBrilho = '#3d6cc4';
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

  // olhos
  const olhos = humor === 'feliz' || humor === 'festa'
    ? `<path d="M74 92 Q82 82 90 92" stroke="#2b1d16" stroke-width="5" fill="none" stroke-linecap="round"/>
       <path d="M110 92 Q118 82 126 92" stroke="#2b1d16" stroke-width="5" fill="none" stroke-linecap="round"/>`
    : humor === 'pensando'
      ? `<circle cx="84" cy="88" r="7" fill="#2b1d16"/><circle cx="120" cy="88" r="7" fill="#2b1d16"/>
         <circle cx="86" cy="85" r="2.4" fill="#fff"/><circle cx="122" cy="85" r="2.4" fill="#fff"/>`
      : `<circle cx="82" cy="91" r="7" fill="#2b1d16"/><circle cx="118" cy="91" r="7" fill="#2b1d16"/>
         <circle cx="84" cy="88" r="2.4" fill="#fff"/><circle cx="120" cy="88" r="2.4" fill="#fff"/>`;

  const sobrancelhas = humor === 'pensando'
    ? `<path d="M72 76 Q82 70 92 76" stroke="#1d2a4a" stroke-width="4" fill="none" stroke-linecap="round"/>
       <path d="M108 72 Q118 68 128 74" stroke="#1d2a4a" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<path d="M72 78 Q82 73 92 78" stroke="#1d2a4a" stroke-width="4" fill="none" stroke-linecap="round"/>
       <path d="M108 78 Q118 73 128 78" stroke="#1d2a4a" stroke-width="4" fill="none" stroke-linecap="round"/>`;

  // boca: sorriso grande com a janelinha nos dentes (ou boquinha de dúvida)
  const boca = humor === 'pensando'
    ? `<path d="M88 116 Q100 112 112 117" stroke="#7a2a2a" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<path d="M76 108 Q100 136 124 108 Z" fill="#7a2a2a"/>
       <path d="M80 109 L96 109 L96 115 L80 113 Z" fill="#fff"/>
       <path d="M104 109 L120 109 L120 113 L104 115 Z" fill="#fff"/>
       <path d="M88 124 Q100 130 112 124 Q100 121 88 124 Z" fill="#e8737a"/>`;

  return `<svg class="davi davi-${humor}" viewBox="0 -26 200 346" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Davi">
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
    <!-- orelhas e cabeça -->
    <circle cx="48" cy="92" r="11" fill="${pele}"/><circle cx="152" cy="92" r="11" fill="${pele}"/>
    <circle cx="48" cy="92" r="5" fill="${peleSombra}"/><circle cx="152" cy="92" r="5" fill="${peleSombra}"/>
    <ellipse cx="100" cy="88" rx="52" ry="50" fill="${pele}"/>
    <!-- cabelo azul espetado -->
    <path d="M47 84 Q42 44 68 32 L64 14 L84 26 L90 8 L104 24 L116 7 L122 26 L140 14 L138 34 Q160 48 153 84 Q146 60 124 56 Q112 48 100 54 Q86 48 74 56 Q54 62 47 84 Z" fill="${cabelo}"/>
    <path d="M70 40 L76 24 M96 32 L98 16 M118 30 L122 16 M134 42 L142 30" stroke="${cabeloBrilho}" stroke-width="4" stroke-linecap="round"/>
    ${sobrancelhas}
    ${olhos}
    <!-- bochechas e nariz -->
    <circle cx="68" cy="106" r="7" fill="#ff8fa0" opacity=".45"/><circle cx="132" cy="106" r="7" fill="#ff8fa0" opacity=".45"/>
    <path d="M97 98 Q100 104 104 98" stroke="${peleSombra}" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${boca}
    </g>
  </svg>`;
}
