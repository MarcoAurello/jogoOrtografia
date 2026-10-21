# Desenha os sprites em pixel art do jogo Peso Certo (balança, objetos e pesos) e grava em assets/balanca/.
# Usa a mesma técnica do ferramentas/tiro-sprites.py: pixel a pixel, com sombreado e contorno escuro.
# Uso: python ferramentas/balanca-sprites.py
import math
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'assets' / 'balanca'
CONTORNO = (26, 22, 38, 255)
VAZIO = (0, 0, 0, 0)


def hexa(c, a=255):
    c = c.lstrip('#')
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


def paleta(*cores):
    return [hexa(c) for c in cores]


LATÃO = paleta('#ffe39a', '#ffbf3c', '#f08c12', '#c2610a', '#7c3a0c')
AÇO = paleta('#e6edf6', '#b8c4d4', '#8a98ad', '#5f6c82', '#3d4658')
MADEIRA = paleta('#f1c48a', '#d99a52', '#b07434', '#7d4f22', '#4f3214')


def tom(p, v):
    i = 0 if v < -0.62 else 1 if v < -0.2 else 2 if v < 0.3 else 3 if v < 0.72 else 4
    return p[i]


def contornar(img):
    px = img.load()
    w, h = img.size
    novos = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 200 and px[nx, ny] != CONTORNO:
                    novos.append((x, y))
                    break
    for x, y in novos:
        px[x, y] = CONTORNO
    return img


def elipse(px, cx, cy, rx, ry, p, luz=(-0.7, -0.7), w=None, h=None):
    """Preenche uma elipse sombreada (luz vindo de cima à esquerda)."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if w and not (0 <= x < w and 0 <= y < h):
                continue
            dx, dy = (x - cx) / rx, (y - cy) / ry
            if dx * dx + dy * dy <= 1:
                v = -(dx * luz[0] + dy * luz[1]) * 0.9 + (dx * dx + dy * dy) * 0.35
                px[x, y] = tom(p, v)


def retangulo(px, x0, y0, x1, y1, p, vertical=True):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            v = ((x - x0) / max(1, x1 - x0) * 2 - 1) if vertical else ((y - y0) / max(1, y1 - y0) * 2 - 1)
            px[x, y] = tom(p, v * 0.9)


# ---------------- Balança (estilo das referências: pratos apoiados nas pontas do travessão) ----------------
ARDÓSIA = paleta('#7f97a6', '#5d7584', '#46606f', '#344b58', '#22343e')
CINZA = paleta('#c9d1d6', '#a9b3ba', '#8b969e', '#6c7780', '#4c565e')
LARANJA = paleta('#ffd27a', '#f5b43c', '#e3981c', '#b8720e', '#7a4a08')


def base():
    """Suporte escuro: cabeça redonda (o eixo), pescoço fino e pé largo."""
    w, h = 40, 46
    img = Image.new('RGBA', (w, h), VAZIO)
    px = img.load()
    for y in range(8, 44):
        k = (y - 8) / 36
        meia = 4 + (k ** 2.2) * 15
        for x in range(w):
            u = (x - 19.5) / meia
            if abs(u) <= 1:
                px[x, y] = tom(ARDÓSIA, u * 0.8 + (0.35 if y > 40 else -0.1))
    elipse(px, 19.5, 8, 7.5, 7.5, ARDÓSIA, w=w, h=h)
    elipse(px, 19.5, 8, 3, 3, CINZA, w=w, h=h)               # pino do eixo
    return contornar(img)


def travessao():
    """Barra cinza com articulações redondas nas pontas."""
    w, h = 132, 12
    img = Image.new('RGBA', (w, h), VAZIO)
    px = img.load()
    for x in range(4, w - 4):
        for y in range(3, 9):
            px[x, y] = tom(CINZA, (y - 5.5) / 3)
    for cx in (5, w - 6):
        elipse(px, cx, 5.5, 4.5, 4.5, ARDÓSIA, w=w, h=h)
        elipse(px, cx, 5.5, 1.6, 1.6, CINZA, w=w, h=h)
    return contornar(img)


def prato():
    """Prato laranja raso com uma hastezinha embaixo, que encaixa na ponta do travessão."""
    w, h = 64, 20
    img = Image.new('RGBA', (w, h), VAZIO)
    px = img.load()
    for y in range(2, 12):                                  # bacia
        k = (y - 2) / 9
        meia = 31 - k * k * 13
        for x in range(w):
            u = (x - 31.5) / meia
            if abs(u) <= 1:
                px[x, y] = tom(LARANJA, u * 0.7 + k * 0.6 - 0.2)
    for x in range(1, w - 1):                               # aba de cima
        px[x, 1] = LARANJA[1]
        px[x, 2] = LARANJA[0]
    for y in range(12, 19):                                 # haste
        for x in range(29, 35):
            px[x, y] = tom(ARDÓSIA, (x - 31.5) / 3)
    return contornar(img)


# ---------------- Pesos: cilindro cinza com pegador e uma faixa na cor da unidade ----------------
UNIDADES = ['kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg']
CORES_PESO = {
    'kg': paleta('#9ad0ff', '#4a9be8', '#2a6fc9', '#1c4f96', '#0f2f5f'),
    'hg': paleta('#b7f0c3', '#5fcf7b', '#2fa552', '#1f7a3b', '#124a24'),
    'dag': paleta('#ffd9a8', '#ffab4a', '#f07e14', '#b8580a', '#6e3306'),
    'g': paleta('#ffe9a0', '#ffd03c', '#e5a80e', '#b07d06', '#6b4a03'),
    'dg': paleta('#f3c4ff', '#d27df0', '#a94bd0', '#7a2f9c', '#4a1a61'),
    'cg': paleta('#ffc2c8', '#ff7a88', '#e4475a', '#a92a3b', '#651722'),
    'mg': paleta('#8a96a8', '#5f6b7d', '#465264', '#333c4b', '#222833'),
}


def peso(unidade):
    w, h = 28, 30
    img = Image.new('RGBA', (w, h), VAZIO)
    px = img.load()
    faixa = CORES_PESO[unidade]
    for y in range(9, 29):                                  # corpo cilíndrico
        for x in range(4, 24):
            u = (x - 13.5) / 10
            cor = tom(CINZA, u * 0.95 - 0.15)
            if 16 <= y <= 21:
                cor = tom(faixa, u * 0.95 - 0.15)
            px[x, y] = cor
    elipse(px, 13.5, 9, 10, 2.6, CINZA, w=w, h=h)            # tampa
    for y in range(9, 11):
        for x in range(5, 23):
            if px[x, y][3]:
                px[x, y] = CINZA[0] if x < 14 else CINZA[1]
    for y in range(4, 9):                                   # pescoço do pegador
        for x in range(11, 17):
            px[x, y] = tom(CINZA, (x - 13.5) / 3)
    elipse(px, 13.5, 3.5, 4, 3, CINZA, w=w, h=h)             # bolinha do pegador
    for x in range(5, 23):                                  # base mais escura
        px[x, 28] = CINZA[4]
    return contornar(img)


# ---------------- Objetos do prato da esquerda ----------------
OBJETOS = ['arroz', 'melancia', 'abobora', 'feijao', 'maca', 'queijo', 'pao', 'banana', 'clipe', 'remedio', 'botao', 'grao']


def objeto(nome):
    w = h = 36
    img = Image.new('RGBA', (w, h), VAZIO)
    px = img.load()
    if nome == 'arroz':   # saco de arroz branco com faixa azul
        for y in range(6, 34):
            meia = 11 + math.sin((y - 6) / 28 * math.pi) * 2
            for x in range(w):
                u = (x - 17.5) / meia
                if abs(u) <= 1:
                    px[x, y] = tom(paleta('#ffffff', '#f1f1ea', '#d8d6c8', '#b3ae99', '#857f69'), u * 0.9)
        for y in range(16, 22):
            for x in range(8, 28):
                if px[x, y][3]:
                    px[x, y] = tom(paleta('#9fd0ff', '#4aa3f0', '#1f6fd0', '#164f9a', '#0d2f63'), (x - 17.5) / 11)
        for x in range(13, 23):
            px[x, 5] = hexa('#d8d6c8')
            px[x, 4] = hexa('#b3ae99')
    elif nome == 'melancia':
        elipse(px, 17.5, 19, 15, 12, paleta('#9be37a', '#4cbf3c', '#2e9a2a', '#1f6f1e', '#134512'), w=w, h=h)
        for y in range(h):
            for x in range(w):
                if px[x, y][3] and int((x + y * 0.3)) % 6 in (0, 1):
                    px[x, y] = hexa('#1f6f1e')
    elif nome == 'abobora':
        for i, dx in enumerate((-7, 0, 7)):
            elipse(px, 17.5 + dx, 21, 7.5, 10, paleta('#ffd08a', '#ff9f2e', '#e8790e', '#b0560a', '#6e3406'), w=w, h=h)
        for y in range(5, 12):
            px[17, y] = hexa('#4f7a1e')
            px[18, y] = hexa('#3a5c15')
    elif nome == 'feijao':   # pacote vermelho com janela
        retangulo(px, 8, 6, 27, 33, paleta('#ff9a8a', '#f0503c', '#c8352a', '#93231f', '#5e1716'))
        for y in range(14, 26):
            for x in range(12, 24):
                px[x, y] = hexa('#5a2a16') if (x + y) % 3 else hexa('#7a3a1e')
        for x in range(8, 28):
            px[x, 6] = hexa('#ffd23a')
    elif nome == 'maca':
        elipse(px, 13, 21, 9, 10, paleta('#ff9a8a', '#f0503c', '#c8352a', '#93231f', '#5e1716'), w=w, h=h)
        elipse(px, 22, 21, 9, 10, paleta('#ff9a8a', '#f0503c', '#c8352a', '#93231f', '#5e1716'), w=w, h=h)
        for y in range(6, 12):
            px[18, y] = hexa('#6b4a1e')
        elipse(px, 23, 8, 4, 2.2, paleta('#b7f08a', '#6cc43a', '#3f9a2a', '#2a6f1e', '#174512'), w=w, h=h)
    elif nome == 'queijo':   # fatia triangular com furos
        for y in range(10, 31):
            for x in range(4, 33):
                if y >= 30 - (x - 4) * 0.75 and y <= 30:
                    v = (y - 20) / 10 * 0.6
                    px[x, y] = tom(paleta('#fff3a8', '#ffd84a', '#f0b818', '#c08a0a', '#7a5604'), v)
        for cx, cy, r in ((22, 25, 2.2), (28, 22, 1.6), (15, 27, 1.5)):
            for y in range(h):
                for x in range(w):
                    if px[x, y][3] and (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                        px[x, y] = hexa('#c08a0a')
    elif nome == 'pao':
        elipse(px, 17.5, 21, 15, 9, paleta('#ffe0a0', '#f2b862', '#d48a34', '#a2601c', '#64380c'), w=w, h=h)
        for dx in (-7, 0, 7):
            for t in range(5):
                x, y = int(17.5 + dx + t - 2), int(15 + t)
                px[x, y] = hexa('#ffe9c0')
    elif nome == 'banana':
        for t in range(60):
            a = math.pi * (0.15 + t / 60 * 0.7)
            cx, cy = 17.5 - math.cos(a) * 13, 8 + math.sin(a) * 18
            elipse(px, cx, cy, 3.6, 3.6, paleta('#fff6a8', '#ffe03c', '#f0c010', '#b88a06', '#6e5203'), w=w, h=h)
        px[4, 11] = hexa('#5a3a14')
        px[31, 11] = hexa('#5a3a14')
    elif nome == 'clipe':
        for t in range(220):
            a = t / 220 * math.pi * 2
            for rx, ry, cy in ((7, 13, 18), (4.5, 9.5, 19)):
                x, y = 17.5 + math.cos(a) * rx, cy + math.sin(a) * ry
                if 0 <= int(x) < w and 0 <= int(y) < h:
                    px[int(x), int(y)] = tom(AÇO, math.cos(a + 2) * 0.8)
    elif nome == 'remedio':   # cápsula metade azul, metade branca
        for y in range(h):
            for x in range(w):
                d = abs(x - y) / math.sqrt(2)
                t = (x + y) / 2
                if d <= 6 and 6 <= t <= 30:
                    v = (x - y) / 12
                    px[x, y] = tom(paleta('#9fd0ff', '#4aa3f0', '#1f6fd0', '#164f9a', '#0d2f63') if t < 18 else paleta('#ffffff', '#f1f1ea', '#d8d6c8', '#b3ae99', '#857f69'), v)
    elif nome == 'botao':
        elipse(px, 17.5, 18, 12, 12, paleta('#ffc2c8', '#ff7a88', '#e4475a', '#a92a3b', '#651722'), w=w, h=h)
        for cx, cy in ((14, 15), (21, 15), (14, 21), (21, 21)):
            for y in range(cy - 1, cy + 2):
                for x in range(cx - 1, cx + 2):
                    px[x, y] = hexa('#651722')
    elif nome == 'grao':
        elipse(px, 17.5, 18, 10, 7, paleta('#c98a5a', '#9a5a2e', '#7a3f1c', '#5a2a12', '#3a1a0a'), w=w, h=h)
        for x in range(12, 24):
            px[x, 16] = hexa('#c98a5a')
    return contornar(img)


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    base().save(SAIDA / 'base.png')
    travessao().save(SAIDA / 'travessao.png')
    prato().save(SAIDA / 'prato.png')
    pesos = Image.new('RGBA', (28 * len(UNIDADES), 30), VAZIO)
    for i, u in enumerate(UNIDADES):
        pesos.paste(peso(u), (i * 28, 0))
    pesos.save(SAIDA / 'pesos.png')
    objetos = Image.new('RGBA', (36 * len(OBJETOS), 36), VAZIO)
    for i, n in enumerate(OBJETOS):
        objetos.paste(objeto(n), (i * 36, 0))
    objetos.save(SAIDA / 'objetos.png')
    print('Sprites gravados em', SAIDA.relative_to(RAIZ))


if __name__ == '__main__':
    main()
