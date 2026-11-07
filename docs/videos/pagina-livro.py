"""Desenha a "página de livro" da cena da IA (texto próprio sobre a Primeira Guerra Mundial, não é de livro real) e a
imagem do celular fotografando a página.

Uso:  python docs/videos/pagina-livro.py [pasta]   (padrão: docs/videos/tmp)
Gera: pagina-livro.jpg (a "foto" que vai para a IA) e celular-foto.png (a cena 10, 1920x1080).
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = pathlib.Path(__file__).resolve().parent
SAIDA = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI / "tmp"
SAIDA.mkdir(parents=True, exist_ok=True)
F = "C:/Windows/Fonts/"
serifa, serifa_b, sans_b = F + "georgia.ttf", F + "georgiab.ttf", F + "segoeuib.ttf"

TITULO = "A Primeira Guerra Mundial (1914–1918)"
PARAGRAFOS = [
    "No início do século XX, as grandes potências da Europa disputavam territórios, mercados e colônias na África e na Ásia. "
    "Essa rivalidade levou à formação de dois blocos militares: a Tríplice Entente, formada por Reino Unido, França e Rússia, "
    "e a Tríplice Aliança, formada por Alemanha, Império Austro-Húngaro e Itália.",
    "O estopim do conflito aconteceu em 28 de junho de 1914, quando o arquiduque Francisco Ferdinando, herdeiro do trono "
    "austro-húngaro, foi assassinado em Sarajevo. Em poucas semanas, as alianças arrastaram vários países para a guerra.",
    "Grande parte dos combates aconteceu nas trincheiras, valas cavadas no chão onde os soldados passavam meses enfrentando "
    "frio, lama e doenças. Novas armas, como metralhadoras, tanques, aviões e gases tóxicos, tornaram a guerra ainda mais violenta.",
    "Em 1917, a Rússia deixou o conflito por causa da revolução em seu território, e os Estados Unidos entraram na guerra ao lado "
    "da Entente. O Brasil também declarou guerra à Alemanha em 1917, depois que navios brasileiros foram afundados por submarinos alemães.",
    "A guerra terminou em 11 de novembro de 1918, com a derrota da Alemanha. Em 1919, o Tratado de Versalhes impôs aos alemães a perda "
    "de territórios e o pagamento de pesadas indenizações. Estima-se que cerca de 17 milhões de pessoas morreram no conflito.",
]
SABIA = "Você sabia? A Itália fazia parte da Tríplice Aliança, mas em 1915 mudou de lado e passou a lutar com a Entente."


def quebrar(d, texto, fonte, largura):
    linhas, atual = [], ""
    for p in texto.split():
        teste = (atual + " " + p).strip()
        if d.textlength(teste, font=fonte) <= largura:
            atual = teste
        else:
            linhas.append(atual)
            atual = p
    return linhas + [atual]


# ---- a página (papel creme, 1400x1900) ----
W, H, M = 1400, 1900, 120
pag = Image.new("RGB", (W, H), (250, 246, 236))
d = ImageDraw.Draw(pag)
d.text((M, 70), "HISTÓRIA  ·  UNIDADE 3", font=ImageFont.truetype(sans_b, 30), fill=(170, 60, 40))
d.line((M, 120, W - M, 120), fill=(170, 60, 40), width=3)
ft = ImageFont.truetype(serifa_b, 62)
y = 170
for l in quebrar(d, TITULO, ft, W - 2 * M):
    d.text((M, y), l, font=ft, fill=(40, 30, 25))
    y += 78
y += 30
fc = ImageFont.truetype(serifa, 36)
for par in PARAGRAFOS:
    for i, l in enumerate(quebrar(d, par, fc, W - 2 * M - (40 if False else 0))):
        d.text((M + (40 if i == 0 else 0), y), l, font=fc, fill=(45, 40, 35))
        y += 52
    y += 22
# o quadro "Você sabia?"
fs = ImageFont.truetype(serifa, 34)
linhas = quebrar(d, SABIA, fs, W - 2 * M - 60)
alt = len(linhas) * 48 + 50
d.rounded_rectangle((M, y, W - M, y + alt), radius=24, fill=(255, 236, 200), outline=(230, 160, 60), width=4)
for i, l in enumerate(linhas):
    d.text((M + 30, y + 25 + i * 48), l, font=ImageFont.truetype(serifa_b, 34) if i == 0 and False else fs, fill=(90, 55, 20))
d.text((W // 2 - 20, H - 90), "48", font=ImageFont.truetype(serifa, 34), fill=(120, 110, 100))

# a "foto" que vai para a IA: um pouco torta, com sombra, em cima da mesa
mesa = Image.new("RGB", (1600, 2100), (120, 84, 56))
for i in range(0, 2100, 14):   # veios da madeira
    ImageDraw.Draw(mesa).line((0, i, 1600, i + 40), fill=(112 + i % 3 * 6, 78, 52), width=6)
sombra = Image.new("RGBA", (W + 80, H + 80), (0, 0, 0, 0))
ImageDraw.Draw(sombra).rectangle((40, 40, W + 40, H + 40), fill=(0, 0, 0, 120))
sombra = sombra.filter(ImageFilter.GaussianBlur(22))
torta = pag.convert("RGBA").rotate(-1.6, expand=True, resample=Image.BICUBIC)
mesa.paste(sombra.rotate(-1.6, expand=True), (70, 70), sombra.rotate(-1.6, expand=True))
mesa.paste(torta, (90, 80), torta)
foto = mesa.resize((1200, 1575), Image.LANCZOS)
foto.save(SAIDA / "pagina-livro.jpg", quality=88)

# ---- cena 10: o celular fotografando a página (1920x1080) ----
cena = Image.new("RGB", (1920, 1080), (0, 0, 0))
fundo = mesa.resize((1920, int(1920 * 2100 / 1600)), Image.LANCZOS).crop((0, 300, 1920, 1380)).filter(ImageFilter.GaussianBlur(3))
cena.paste(fundo, (0, 0))
# o celular, em pé no meio, mostrando a câmera
cw, ch = 520, 1000
cel = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
dc = ImageDraw.Draw(cel)
dc.rounded_rectangle((0, 0, cw, ch), radius=70, fill=(25, 25, 30))
visor = Image.new("RGB", (1600, 3200), (120, 84, 56))   # o que a câmera vê: a página inteira com a mesa em volta
for i in range(0, 3200, 14):
    ImageDraw.Draw(visor).line((0, i, 1600, i + 40), fill=(112 + i % 3 * 6, 78, 52), width=6)
visor.paste(mesa, (0, 450))
tela = visor.resize((cw - 40, ch - 40), Image.LANCZOS)
mascara = Image.new("L", tela.size, 0)
ImageDraw.Draw(mascara).rounded_rectangle((0, 0, *tela.size), radius=52, fill=255)
cel.paste(tela, (20, 20), mascara)
dc.rounded_rectangle((cw // 2 - 70, 34, cw // 2 + 70, 62), radius=14, fill=(10, 10, 12))   # câmera da frente
# moldura de foco e botão de disparo
for x0, y0, sx, sy in ((70, 150, 1, 1), (cw - 70, 150, -1, 1), (70, ch - 230, 1, -1), (cw - 70, ch - 230, -1, -1)):
    dc.line((x0, y0, x0 + 60 * sx, y0), fill=(255, 210, 60), width=6)
    dc.line((x0, y0, x0, y0 + 60 * sy), fill=(255, 210, 60), width=6)
dc.rounded_rectangle((20, ch - 190, cw - 20, ch - 20), radius=52, fill=(18, 18, 22, 255))
dc.ellipse((cw // 2 - 52, ch - 158, cw // 2 + 52, ch - 54), outline=(255, 255, 255), width=8)
dc.ellipse((cw // 2 - 40, ch - 146, cw // 2 + 40, ch - 66), fill=(255, 255, 255))
sombra_cel = Image.new("RGBA", (cw + 120, ch + 120), (0, 0, 0, 0))
ImageDraw.Draw(sombra_cel).rounded_rectangle((60, 60, cw + 60, ch + 60), radius=70, fill=(0, 0, 0, 150))
sombra_cel = sombra_cel.filter(ImageFilter.GaussianBlur(25))
cena.paste(sombra_cel, (700 - 60 + 20, 40 - 60 + 30), sombra_cel)
cena.paste(cel, (700, 40), cel)
cena.save(SAIDA / "celular-foto.png")
print("Página e celular prontos em", SAIDA)
