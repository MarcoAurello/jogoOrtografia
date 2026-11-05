/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Bandeiras dos países do Conexão Global, desenhadas em SVG (o emoji de bandeira não aparece no Windows). */
// As mais complicadas (brasões, escritas) ficam simplificadas, mas reconhecíveis. Todas no tamanho 30 x 20.

// estrela de 5 pontas com centro (x, y) e raio r
function estrela(x, y, r, cor, giro = 0) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2 + giro, rr = i % 2 ? r * 0.4 : r;
    pts.push(`${(x + Math.cos(a) * rr).toFixed(2)},${(y + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${cor}"/>`;
}
const faixasH = (...cores) => cores.map((c, i) => `<rect y="${(20 / cores.length) * i}" width="30" height="${20 / cores.length + 0.05}" fill="${c}"/>`).join('');
const faixasV = (...cores) => cores.map((c, i) => `<rect x="${(30 / cores.length) * i}" width="${30 / cores.length + 0.05}" height="20" fill="${c}"/>`).join('');
// a bandeira do Reino Unido em um retângulo (usada também no canto da australiana)
const unionJack = (w, h) => `<svg width="${w}" height="${h}" viewBox="0 0 60 30" preserveAspectRatio="none">
  <rect width="60" height="30" fill="#012169"/><path d="M0 0L60 30M60 0L0 30" stroke="#fff" stroke-width="6"/>
  <path d="M0 0L60 30M60 0L0 30" stroke="#c8102e" stroke-width="2"/><path d="M30 0V30M0 15H60" stroke="#fff" stroke-width="10"/>
  <path d="M30 0V30M0 15H60" stroke="#c8102e" stroke-width="6"/></svg>`;

const DESENHOS = {
  brasil: () => `<rect width="30" height="20" fill="#009c3b"/><polygon points="15,2.3 27.5,10 15,17.7 2.5,10" fill="#ffdf00"/>
    <circle cx="15" cy="10" r="4.6" fill="#002776"/><path d="M10.6 9.1 Q15 7.6 19.4 10.4" stroke="#fff" stroke-width="0.8" fill="none"/>`,
  eua: () => faixasH(...Array.from({ length: 13 }, (_, i) => (i % 2 ? '#fff' : '#b22234')))
    + `<rect width="13" height="10.8" fill="#3c3b6e"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${1.6 + (i % 4) * 3.3}" cy="${1.8 + Math.floor(i / 4) * 3.5}" r="0.7" fill="#fff"/>`).join('')}`,
  mexico: () => faixasV('#006847', '#fff', '#ce1126') + '<circle cx="15" cy="10" r="2.6" fill="#8c5a2b" opacity="0.85"/><path d="M12.8 11.8 Q15 13.5 17.2 11.8" stroke="#2e7d32" stroke-width="0.7" fill="none"/>',
  canada: () => '<rect width="30" height="20" fill="#fff"/><rect width="7.5" height="20" fill="#d52b1e"/><rect x="22.5" width="7.5" height="20" fill="#d52b1e"/>'
    + '<path d="M15 4 L16 6.6 L17.6 5.8 L17 9 L19.2 8.2 L18.6 10 L20 10.6 L16.8 12.8 L17.2 14 L15.4 13.6 L15.4 16 L14.6 16 L14.6 13.6 L12.8 14 L13.2 12.8 L10 10.6 L11.4 10 L10.8 8.2 L13 9 L12.4 5.8 L14 6.6 Z" fill="#d52b1e"/>',
  argentina: () => faixasH('#74acdf', '#fff', '#74acdf') + '<circle cx="15" cy="10" r="2.3" fill="#f6b40e" stroke="#85340a" stroke-width="0.3"/>',
  chile: () => faixasH('#fff', '#d52b1e') + `<rect width="10" height="10" fill="#0039a6"/>${estrela(5, 5, 3, '#fff')}`,
  china: () => `<rect width="30" height="20" fill="#de2910"/>${estrela(5, 5, 3, '#ffde00')}${estrela(10, 2, 1, '#ffde00', 0.4)}${estrela(12, 4, 1, '#ffde00', 0.8)}${estrela(12, 7, 1, '#ffde00', 0)}${estrela(10, 9, 1, '#ffde00', 0.4)}`,
  japao: () => '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>',
  coreia: () => `<rect width="30" height="20" fill="#fff"/>
    <path d="M10.5 10 A4.5 4.5 0 0 1 19.5 10 A2.25 2.25 0 0 1 15 10 A2.25 2.25 0 0 0 10.5 10 Z" fill="#cd2e3a" transform="rotate(34 15 10)"/>
    <path d="M10.5 10 A4.5 4.5 0 0 0 19.5 10 A2.25 2.25 0 0 1 15 10 A2.25 2.25 0 0 0 10.5 10 Z" fill="#0047a0" transform="rotate(34 15 10)"/>
    <g stroke="#000" stroke-width="0.9"><path d="M4.4 4.6 L7.2 2.6 M5 5.4 L7.8 3.4 M5.6 6.2 L8.4 4.2"/><path d="M21.6 13.8 L24.4 15.8 M22.2 13 L25 15 M22.8 12.2 L25.6 14.2"/>
    <path d="M21.6 6.2 L24.4 4.2 M22.2 7 L25 5 M22.8 7.8 L25.6 5.8"/><path d="M4.4 15.4 L7.2 17.4 M5 14.6 L7.8 16.6 M5.6 13.8 L8.4 15.8"/></g>`,
  india: () => faixasH('#ff9933', '#fff', '#138808') + '<circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width="0.6"/><circle cx="15" cy="10" r="0.6" fill="#000080"/>'
    + Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="15" y1="10" x2="${(15 + Math.cos(a) * 2.6).toFixed(2)}" y2="${(10 + Math.sin(a) * 2.6).toFixed(2)}" stroke="#000080" stroke-width="0.25"/>`; }).join(''),
  arabia: () => '<rect width="30" height="20" fill="#006c35"/><path d="M8 7.5 q1.5 -2 3 0 t3 0 t3 0 t3 0 M9 9.5 h12" stroke="#fff" stroke-width="0.9" fill="none"/>'
    + '<path d="M8 13 H21 L22.5 12.2 M9 13 v-0.8" stroke="#fff" stroke-width="0.9" fill="none"/>',
  vietna: () => `<rect width="30" height="20" fill="#da251d"/>${estrela(15, 10.4, 5.2, '#ffff00')}`,
  indonesia: () => faixasH('#ce1126', '#fff'),
  russia: () => faixasH('#fff', '#0039a6', '#d52b1e'),
  alemanha: () => faixasH('#000', '#dd0000', '#ffce00'),
  franca: () => faixasV('#0055a4', '#fff', '#ef4135'),
  italia: () => faixasV('#009246', '#fff', '#ce2b37'),
  paisesbaixos: () => faixasH('#ae1c28', '#fff', '#21468b'),
  reinounido: () => unionJack(30, 20),
  suica: () => '<rect width="30" height="20" fill="#da291c"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/>',
  espanha: () => '<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/><rect x="7" y="7.6" width="3" height="4" rx="0.6" fill="#aa151b" opacity="0.75"/>',
  africadosul: () => `<rect width="30" height="20" fill="#fff"/><rect width="30" height="10" fill="#de3831"/><rect y="10" width="30" height="10" fill="#002395"/>
    <path d="M0 0 L13 10 L0 20" fill="#fff"/><path d="M0 0 L13 10 L30 10 M0 20 L13 10" stroke="#fff" stroke-width="6" fill="none"/>
    <path d="M0 0 L13 10 L30 10 M0 20 L13 10" stroke="#007a4d" stroke-width="3.6" fill="none"/>
    <path d="M0 2.6 L9.6 10 L0 17.4 Z" fill="#ffb612"/><path d="M0 4.4 L7.3 10 L0 15.6 Z" fill="#000"/>`,
  nigeria: () => faixasV('#008751', '#fff', '#008751'),
  egito: () => faixasH('#ce1126', '#fff', '#000') + '<path d="M15 7.8 L16.4 9.2 L16 12 L14 12 L13.6 9.2 Z" fill="#c09300"/>',
  australia: () => `<rect width="30" height="20" fill="#012169"/>${unionJack(15, 10)}${estrela(7.5, 15.5, 2.4, '#fff')}
    ${estrela(22.5, 16.5, 1.2, '#fff')}${estrela(19.5, 9, 1.2, '#fff')}${estrela(22.5, 4, 1.2, '#fff')}${estrela(25.5, 8, 1.2, '#fff')}${estrela(24, 11.5, 0.7, '#fff')}`,
};

// a bandeira pronta para colocar no HTML; nome vai no aria-label (quem usa leitor de tela ouve o país)
export function bandeira(id, nome = '', classe = 'bandeira') {
  const desenho = DESENHOS[id];
  return `<svg class="${classe}" viewBox="0 0 30 20" role="img" aria-label="${nome ? `Bandeira: ${nome}` : 'Bandeira'}"><g>${desenho ? desenho() : '<rect width="30" height="20" fill="#ccc"/>'}</g>`
    + '<rect width="30" height="20" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="0.6"/></svg>';
}
