# Veste o Plenix com a farda da Rede Estadual: camisa branca, gola azul-marinho, faixa amarela,
# vermelha e azul no peito, brasão no lugar do botão, calça jeans e fones vermelhos.
# Lê a folha original (assets/plenix-original/plenix_spritesheet_original.png, roxa e cinza)
# e grava assets/plenix/plenix_spritesheet_1x.png (folha 4x4, quadros de 40x50).
# Uso: python ferramentas/plenix-farda.py
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / 'assets/plenix-original/plenix_spritesheet_original.png'
SAIDA = RAIZ / 'assets/plenix/plenix_spritesheet_1x.png'
QW, QH = 40, 50

# cores da folha original
CAMISA, CAMISA_SOMBRA, CAMISA_LUZ = (128, 128, 134), (95, 95, 102), (160, 160, 166)
GOLA, CINTO = (70, 70, 80), (75, 30, 120)
ROXO, ROXO_LUZ, AMARELO = (110, 50, 170), (150, 90, 210), (255, 205, 40)

# cores da farda
BRANCO, BRANCO_SOMBRA, BRANCO_LUZ = (246, 248, 252), (196, 208, 226), (255, 255, 255)
MARINHO = (16, 42, 104)
FAIXA = [(247, 200, 30), (229, 57, 53), (21, 101, 192)]          # de cima para baixo
FAIXA_SOMBRA = [(206, 160, 20), (178, 40, 40), (14, 70, 140)]
BRASAO = (30, 140, 80)
JEANS, JEANS_LUZ = (38, 64, 120), (74, 104, 160)
CINTO_NOVO = (20, 30, 60)
FONE, FONE_LUZ = (229, 57, 53), (255, 130, 120)


def vestir(img, x0, y0):
    px = img.load()
    cor = lambda x, y: px[x0 + x, y0 + y][:3]
    linhas_cinto = [y for y in range(QH) if any(cor(x, y) == CINTO for x in range(QW))]
    cinto = linhas_cinto[0] if linhas_cinto else QH
    # o botão do peito (roxo ao redor do amarelo) vira o brasão
    brasao = {(x + dx, y + dy) for y in range(QH) for x in range(QW) if cor(x, y) == AMARELO and y < cinto
              for dx in (-1, 0, 1) for dy in (-1, 0, 1)}
    for y in range(QH):
        for x in range(QW):
            r, g, b, a = px[x0 + x, y0 + y]
            if a == 0:
                continue
            c = (r, g, b)
            novo = None
            if c in (CAMISA, CAMISA_SOMBRA, CAMISA_LUZ):
                faixa = cinto - 4 <= y <= cinto - 2
                if faixa:
                    i = y - (cinto - 4)
                    novo = FAIXA_SOMBRA[i] if c == CAMISA_SOMBRA else FAIXA[i]
                else:
                    novo = {CAMISA: BRANCO, CAMISA_SOMBRA: BRANCO_SOMBRA, CAMISA_LUZ: BRANCO_LUZ}[c]
            elif c == GOLA:
                novo = MARINHO
            elif c == CINTO:
                novo = CINTO_NOVO
            elif c in (ROXO, ROXO_LUZ):
                if (x, y) in brasao:
                    novo = BRASAO
                elif y >= cinto:
                    novo = JEANS if c == ROXO else JEANS_LUZ
                else:
                    novo = FONE if c == ROXO else FONE_LUZ
            if novo:
                px[x0 + x, y0 + y] = (*novo, a)


img = Image.open(ENTRADA).convert('RGBA')
for linha in range(img.height // QH):
    for coluna in range(img.width // QW):
        vestir(img, coluna * QW, linha * QH)
img.save(SAIDA)
print('Plenix com a farda:', SAIDA.relative_to(RAIZ))
