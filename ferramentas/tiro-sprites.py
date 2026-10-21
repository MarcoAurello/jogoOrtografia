# Desenha os sprites em pixel art do jogo Tiro Certo (canhão, míssil, bala, explosão e munição)
# e grava em assets/tiro/. Cada sprite é desenhado pixel a pixel, com sombreado e contorno escuro.
# Uso: python ferramentas/tiro-sprites.py
import math
import random
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'assets' / 'tiro'
CONTORNO = (26, 22, 38, 255)


def hexa(c, a=255):
    c = c.lstrip('#')
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


AÇO = [hexa(c) for c in ('#c9d3e2', '#8e9bb0', '#66748a', '#4a5568', '#323a48')]
LATÃO = [hexa(c) for c in ('#ffe39a', '#ffbf3c', '#f08c12', '#c2610a', '#7c3a0c')]
VERMELHO = [hexa(c) for c in ('#ff8a74', '#f0503c', '#c8352a', '#93231f', '#5e1716')]
MADEIRA = [hexa(c) for c in ('#f1c48a', '#d99a52', '#b07434', '#7d4f22', '#4f3214')]
BRANCO = [hexa(c) for c in ('#ffffff', '#eef2f7', '#cdd6e2', '#9eabbf', '#6f7d93')]
AZUL = [hexa(c) for c in ('#9fd0ff', '#4aa3f0', '#1f6fd0', '#164f9a', '#0d2f63')]


def tom(paleta, v):
    """v de -1 (lado iluminado) a 1 (lado da sombra)."""
    i = 0 if v < -0.62 else 1 if v < -0.2 else 2 if v < 0.3 else 3 if v < 0.72 else 4
    return paleta[i]


def contornar(img):
    """Contorno escuro de 1 pixel em volta de tudo que é opaco (o jeito clássico de pixel art)."""
    px = img.load()
    w, h = img.size
    novos = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] and px[nx, ny] != CONTORNO:
                    novos.append((x, y))
                    break
    for x, y in novos:
        px[x, y] = CONTORNO
    return img


# ---------------- Cano do canhão (gira; o pivô fica no meio da traseira) ----------------
def cano():
    w, h = 46, 18
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    cy = (h - 1) / 2
    for x in range(w):
        # meia-altura do cano em cada x: traseira redonda, corpo afinando, boca alargada
        if x < 5:
            meia = math.sqrt(max(0, 4.2 ** 2 - (x - 4) ** 2))
        elif x < 39:
            meia = 6.3 - (x - 5) * 0.035
        else:
            meia = 7.4
        for y in range(h):
            v = (y - cy) / max(meia, 0.1)
            if abs(v) > 1:
                continue
            faixa = x in (11, 12, 13) or x in (21, 22, 23) or x in (31, 32, 33)
            if x < 5 or x >= 39 or faixa:
                cor = tom(LATÃO, v)
            else:
                cor = tom(AÇO, v)
                if -0.62 <= v < -0.35 and x % 6 not in (0, 1):   # reflexo comprido no aço
                    cor = AÇO[0]
            px[x, y] = cor
    # boca do cano (buraco escuro)
    for y in range(int(cy) - 3, int(cy) + 4):
        px[w - 1, y] = hexa('#1b1b26')
        px[w - 2, y] = hexa('#2b2b38')
    return contornar(img)


# ---------------- Carreta vermelha com roda de madeira (não gira) ----------------
def carreta():
    w, h = 52, 40
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()

    def dentro_poligono(x, y, pts):
        dentro = False
        j = len(pts) - 1
        for i in range(len(pts)):
            xi, yi = pts[i]
            xj, yj = pts[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                dentro = not dentro
            j = i
        return dentro

    # sombra no chão
    for y in range(h - 4, h - 1):
        for x in range(4, 48):
            if ((x - 26) / 22) ** 2 + ((y - (h - 2.5)) / 1.6) ** 2 <= 1:
                px[x, y] = (20, 30, 60, 70)
    # corpo da carreta (cunha)
    pts = [(3, 31), (36, 31), (40, 20), (30, 9), (17, 9), (6, 19)]
    for y in range(h):
        for x in range(w):
            if dentro_poligono(x + 0.5, y + 0.5, pts):
                v = (y - 20) / 11 + (x - 22) / 60
                if y % 5 == 0 and 8 < x < 36:   # tábuas da carreta
                    v += 0.5
                px[x, y] = tom(VERMELHO, v)
    # rebites dourados e friso de madeira
    for x, y in ((12, 24), (20, 26), (28, 26), (34, 23)):
        px[x, y] = LATÃO[1]
        px[x + 1, y] = LATÃO[2]
    for x in range(8, 36):
        y = 28
        if px[x, y][3]:
            px[x, y] = MADEIRA[2]
    # suporte do eixo do cano
    for y in range(9, 17):
        for x in range(20, 30):
            if (x - 25) ** 2 + (y - 13) ** 2 <= 16:
                px[x, y] = tom(LATÃO, ((y - 13) / 4))
    # roda grande
    cx, cy, R = 31, 28, 10.5
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy)
            if d <= R:
                ang = math.atan2(y - cy, x - cx)
                if d > R - 2.2:   # aro
                    luz = math.sin(ang + 2.2)
                    px[x, y] = VERMELHO[1] if luz > 0.5 else VERMELHO[2] if luz > -0.3 else VERMELHO[3]
                elif d < 2.6:     # cubo
                    px[x, y] = LATÃO[1] if (x - cx) + (y - cy) < 0 else LATÃO[2]
                else:
                    raio = (ang % (math.pi / 4)) / (math.pi / 4)
                    if raio < 0.24 or raio > 0.9:   # 8 raios de madeira
                        px[x, y] = MADEIRA[1] if math.sin(ang * 2) > 0 else MADEIRA[2]
                    else:
                        px[x, y] = (0, 0, 0, 0)
    # roda pequena de trás
    cx2, cy2, r2 = 9, 31, 5
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx2, y - cy2)
            if d <= r2:
                px[x, y] = LATÃO[2] if d < 1.8 else VERMELHO[2] if d > r2 - 1.6 else VERMELHO[3]
    return contornar(img)


# ---------------- Míssil (aponta para cima; 3 quadros de fogo) ----------------
def missil(quadro):
    w, h = 16, 42
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    cx = (w - 1) / 2
    for y in range(h):
        for x in range(w):
            u = (x - cx)
            if y < 9:   # ogiva vermelha pontuda
                meia = 0.6 + y * 0.52
                if abs(u) <= meia:
                    px[x, y] = tom(VERMELHO, u / max(meia, 1) * 1.1 - 0.15)
            elif y < 28:   # corpo branco
                if abs(u) <= 4.6:
                    cor = tom(BRANCO, u / 4.6 * 1.1 - 0.1)
                    if y in (11, 12):
                        cor = tom(AZUL, u / 4.6)
                    if y in (24, 25):
                        cor = tom(VERMELHO, u / 4.6)
                    px[x, y] = cor
            elif y < 31:   # bocal
                if abs(u) <= 3.5:
                    px[x, y] = tom(AÇO, u / 3.5 + 0.2)
    # janela redonda (4x4 sem os cantos), com aro e brilho
    for y in range(15, 19):
        for x in range(6, 10):
            if (x in (6, 9)) and (y in (15, 18)):
                continue
            px[x, y] = AZUL[2] if x + y > 24 else AZUL[1]
    px[7, 16] = AZUL[0]
    # aletas laterais e central
    for y in range(20, 31):
        k = y - 20
        for x in range(w):
            u = x - cx
            if 4.6 < abs(u) <= 4.6 + min(3, k * 0.45) and y < 30:
                px[x, y] = VERMELHO[1] if u < 0 else VERMELHO[3]
    contornar(img)
    # fogo (sem contorno, para brilhar)
    random.seed(quadro * 7 + 3)
    comprimento = (8, 11, 9)[quadro]
    fogo = [hexa('#fff6b0'), hexa('#ffd23a'), hexa('#ff8c1a'), hexa('#e8461c')]
    for y in range(31, 31 + comprimento):
        k = (y - 31) / comprimento
        meia = 3.2 * (1 - k) + 0.6
        for x in range(w):
            u = abs(x - cx) + random.uniform(-0.4, 0.4)
            if u <= meia:
                i = min(3, int(k * 3 + u / max(meia, 0.5) * 1.3))
                px[x, y] = fogo[i]
    return img


# ---------------- Bala do canhão ----------------
def bala():
    img = Image.new('RGBA', (10, 10), (0, 0, 0, 0))
    px = img.load()
    for y in range(10):
        for x in range(10):
            d = math.hypot(x - 4.5, y - 4.5)
            if d <= 4.2:
                v = ((x - 4.5) + (y - 4.5)) / 6
                px[x, y] = tom([hexa('#a7b0c0'), hexa('#6b7488'), hexa('#3f4656'), hexa('#2a2f3c'), hexa('#1c2029')], v)
    px[3, 3] = hexa('#e6ebf3')
    return contornar(img)


# ---------------- Explosão (6 quadros) ----------------
def explosao():
    tam, quadros = 48, 6
    folha = Image.new('RGBA', (tam * quadros, tam), (0, 0, 0, 0))
    cores = [hexa('#ffffff'), hexa('#fff3a0'), hexa('#ffc53a'), hexa('#ff7a1a'), hexa('#e2401c'), hexa('#8a2a1a')]
    fumaca = [hexa('#9aa3b5', 220), hexa('#6d7487', 200), hexa('#4b5060', 170)]
    for q in range(quadros):
        random.seed(40 + q)
        img = Image.new('RGBA', (tam, tam), (0, 0, 0, 0))
        px = img.load()
        R = 7 + min(q, 3) * 3.6 + (q - 3) * 1.5 * (q > 3)
        bolhas = [(random.uniform(-0.5, 0.5) * R, random.uniform(-0.5, 0.5) * R, R * random.uniform(0.45, 0.7)) for _ in range(7)]
        for y in range(tam):
            for x in range(tam):
                dx, dy = x - tam / 2 + 0.5, y - tam / 2 + 0.5
                melhor = min(math.hypot(dx - bx, dy - by) / br for bx, by, br in bolhas)
                if melhor > 1:
                    continue
                if q >= 4:   # vira fumaça no fim: nuvens lisas, claras em cima e escuras embaixo
                    alfa = 150 if q == 4 else 80
                    v = dy / R + melhor * 0.6 - 0.2
                    cor = fumaca[0] if v < -0.1 else fumaca[1] if v < 0.45 else fumaca[2]
                    px[x, y] = (*cor[:3], alfa)
                else:
                    i = int(melhor * 4 + q * 0.7)
                    px[x, y] = cores[min(5, i)]
        # faíscas
        for _ in range(10 + q * 2):
            a = random.uniform(0, math.pi * 2)
            d = R + random.uniform(0, 6)
            x, y = int(tam / 2 + math.cos(a) * d), int(tam / 2 + math.sin(a) * d)
            if 0 <= x < tam and 0 <= y < tam and q < 5:
                px[x, y] = cores[2] if random.random() < 0.6 else cores[1]
        folha.paste(img, (q * tam, 0))
    return folha


# ---------------- Munição (ícone do contador de tiros) ----------------
def municao():
    img = Image.new('RGBA', (10, 16), (0, 0, 0, 0))
    px = img.load()
    for y in range(16):
        for x in range(10):
            u = (x - 4.5) / 3.5
            if y < 5:
                meia = 1 + y * 0.6
                if abs(x - 4.5) <= meia:
                    px[x, y] = tom(AÇO, u)
            elif abs(x - 4.5) <= 3.5:
                px[x, y] = tom(LATÃO, u) if y < 13 else tom(LATÃO, u + 0.4)
    return contornar(img)


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    cano().save(SAIDA / 'canhao-cano.png')
    carreta().save(SAIDA / 'canhao-carreta.png')
    folha = Image.new('RGBA', (16 * 3, 42), (0, 0, 0, 0))
    for q in range(3):
        folha.paste(missil(q), (q * 16, 0))
    folha.save(SAIDA / 'missil.png')
    bala().save(SAIDA / 'bala.png')
    explosao().save(SAIDA / 'explosao.png')
    municao().save(SAIDA / 'municao.png')
    print('Sprites gravados em', SAIDA.relative_to(RAIZ))


if __name__ == '__main__':
    main()
