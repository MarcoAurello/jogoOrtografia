"""Monta o vídeo da gestão: as telas gravadas (gravar-telas.py) + a narração (narracao.py) + legendas e rótulos.

Uso:  python docs/videos/montar-video.py
Precisa de: pip install imageio-ffmpeg pillow numpy (o imageio-ffmpeg traz o ffmpeg).
Cada cena dura o tempo da fala + uma folga; dentro da cena, as fotos passam com um zoom lento e se misturam
suavemente. As legendas são o texto da narração (cenas.json), no ritmo das frases que a voz devolveu.
Saída: assets/video/gestao-jogos-pedagogicos.mp4 e assets/video/capa-gestao.jpg. Sem música (não temos uma
trilha com licença garantida).
"""
import json
import pathlib
import subprocess
import sys

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
TMP = AQUI / "tmp"
TELAS, AUDIO = TMP / "telas", TMP / "audio"
SAIDA = RAIZ / "assets" / "video"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1920, 1080, 25
TAXA = 44100
CFG = json.loads((AQUI / "cenas.json").read_text(encoding="utf-8"))
F = "C:/Windows/Fonts/"
FONTE_LEG = ImageFont.truetype(F + "segoeuisb.ttf" if pathlib.Path(F + "segoeuisb.ttf").exists() else F + "segoeuib.ttf", 43)
FONTE_ROT = ImageFont.truetype(F + "segoeuib.ttf", 34)
FONTE_TIT = ImageFont.truetype(F + "segoeuib.ttf", 64)
FONTE_SUB = ImageFont.truetype(F + "segoeui.ttf", 38)
COR = (0, 121, 107)   # o verde-azulado da gestão da escola
ANTES, DEPOIS = 0.45, 0.75     # folga antes e depois da fala, em segundos
TROCA_FOTO, TROCA_CENA = 0.45, 0.6
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


# ---------------------------------------------------------------- cartões (abertura e fim)
def cartao(titulo, subtitulo, rodape=""):
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    for y in range(H):   # degradê suave
        t = y / H
        d.line((0, y, W, y), fill=(int(232 + 18 * t), int(246 + 6 * t), int(244 + 8 * t)))
    logo = Image.open(RAIZ / "assets" / "logo-games.webp").convert("RGBA")
    alt = 440
    logo = logo.resize((int(logo.width * alt / logo.height), alt), Image.LANCZOS)
    img.paste(logo, ((W - logo.width) // 2, 70), logo)
    for texto, fonte, y, cor in ((titulo, FONTE_TIT, 545, (20, 40, 60)), (subtitulo, FONTE_SUB, 630, (60, 80, 95)), (rodape, FONTE_ROT, 700, COR)):
        if texto:
            d.text(((W - d.textlength(texto, font=fonte)) / 2, y), texto, font=fonte, fill=cor)
    return img


# ---------------------------------------------------------------- as fotos de cada cena
def t(nome):
    return TELAS / f"{nome}.png"


def fotos_da_ia():
    """cena 11: 3 momentos do progresso e depois o editor com as perguntas"""
    todas = sorted(TELAS.glob("11_*.png"), key=lambda p: int(p.stem.split("_")[1]))
    progresso, editor = todas[:-2], todas[-2:]
    meio = progresso[len(progresso) // 2] if progresso else None
    escolha = [x for x in (progresso[0] if progresso else None, meio, progresso[-1] if progresso else None) if x]
    return [(p, 0.55, {}) for p in escolha] + [(editor[0], 1.2, {"z": (1.0, 1.08), "c": (0.55, 0.85)}), (editor[1], 1.5, {})]


ZOOM_FAMILIA = {"z": (1.32, 1.4), "c": (0.5, 0.36)}
CENAS = {
    1: [("abertura", 1.3, {"z": (1.0, 1.04)}), (t("01_1"), 0.9, {}), (t("01_2"), 1.0, {"z": (1.04, 1.12), "c": (0.5, 0.45)})],
    2: [(t("02_1"), 1.2, {"z": (1.0, 1.1), "c": (0.5, 0.3)}), (t("02_2"), 1.0, {})],
    3: [(t("03_1"), 0.8, {}), (t("03_2"), 1.2, {"z": (1.02, 1.1), "c": (0.62, 0.6)})],
    4: [(t("04_1"), 0.8, {}), (t("04_2"), 1.2, {"z": (1.0, 1.18), "c": (0.4, 0.35)})],
    5: [(t("05_1"), 1.2, {"z": (1.0, 1.1), "c": (0.6, 0.45)}), (t("05_2"), 1.0, {})],
    6: [(t("06_1"), 0.9, {}), (t("06_2"), 1.3, {"z": (1.0, 1.2), "c": (0.82, 0.35)})],
    7: [(t("07_1"), 0.7, {}), (t("07_2"), 0.9, {}), (t("07_3"), 1.1, {"z": (1.0, 1.15), "c": (0.5, 0.45)})],
    8: [(t("08_1"), 0.8, {}), (t("08_2"), 1.0, {"z": (1.0, 1.12), "c": (0.7, 0.35)}), (t("08_3"), 1.1, {"z": (1.08, 1.14), "c": (0.5, 0.4)})],
    9: [(t("09_1"), 0.7, {}), (t("09_2"), 0.9, {"z": (1.0, 1.15), "c": (0.75, 0.55)}), (t("09_3"), 1.1, {})],
    10: [(TMP / "celular-foto.png", 1.2, {"z": (1.0, 1.08)}), (t("10_1"), 1.0, {}), (t("10_2"), 0.7, {"z": (1.05, 1.12), "c": (0.3, 0.75)})],
    11: "ia",
    12: [(t("12_1"), 1.2, {"z": (1.0, 1.1), "c": (0.55, 0.3)}), (t("12_2"), 0.6, {"z": (1.0, 1.08), "c": (0.8, 0.9)}), (t("12_3"), 1.0, {})],
    13: [(t("13_1"), 0.7, {}), (t("13_2"), 1.4, {"z": (1.0, 1.15), "c": (0.5, 0.45)})],
    14: [(t("14_1"), 1.0, {}), (t("14_2"), 1.0, {"z": (1.0, 1.08), "c": (0.65, 0.5)})],
    15: [(t("15_1"), 0.8, ZOOM_FAMILIA), (t("15_2"), 1.2, ZOOM_FAMILIA), (t("15_3"), 0.9, ZOOM_FAMILIA)],
    16: [(t("16_1"), 0.8, {}), (t("16_2"), 1.0, {}), (t("16_3"), 1.0, {})],
    17: [("fim", 1.0, {"z": (1.0, 1.05)})],
}


def carregar(origem):
    if origem == "abertura":
        return cartao("Painel de gestão", "Escolas e psicopedagogia acompanhando cada criança")
    if origem == "fim":
        return cartao("Jogos Pedagógicos", "Escola, família e criança juntas, brincando", "gamespedagogicos.store")
    img = Image.open(origem).convert("RGB")
    return img if img.size == (W, H) else img.resize((W, H), Image.LANCZOS)


# ---------------------------------------------------------------- legendas e rótulos
def quebrar(d, texto, fonte, largura):
    linhas, atual = [], ""
    for p in texto.split():
        teste = (atual + " " + p).strip()
        if d.textlength(teste, font=fonte) <= largura or not atual:
            atual = teste
        else:
            linhas.append(atual)
            atual = p
    return linhas + ([atual] if atual else [])


def pedacos_da_legenda(cena, audio_dur):
    """divide cada frase da fala em pedaços de até 2 linhas; o tempo de cada pedaço é proporcional ao tamanho"""
    marcas = json.loads((AUDIO / f"{cena['n']:02d}.json").read_text(encoding="utf-8")) or [{"texto": cena["texto"], "inicio": 0, "fim": audio_dur}]
    d = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    saida = []
    for m in marcas:
        palavras, blocos, atual = m["texto"].split(), [], []
        for p in palavras:
            if len(quebrar(d, " ".join(atual + [p]), FONTE_LEG, 1500)) > 2:
                # corta de preferência depois de uma vírgula ou dois-pontos, se ela estiver da metade em diante
                corte = max((k + 1 for k, w in enumerate(atual) if w[-1] in ",:;" and k + 1 >= len(atual) // 2), default=len(atual))
                blocos.append(" ".join(atual[:corte]))
                atual = atual[corte:]
            atual.append(p)
        if atual:
            blocos.append(" ".join(atual))
        # evita um último pedaço de 1 a 3 palavras: divide melhor os dois últimos
        if len(blocos) >= 2 and len(blocos[-1].split()) <= 3:
            junto = (blocos[-2] + " " + blocos[-1]).split()
            meio = len(junto) // 2
            blocos[-2:] = [" ".join(junto[:meio]), " ".join(junto[meio:])]
        total = sum(len(b) for b in blocos)
        ini = m["inicio"]
        for b in blocos:
            dur = (m["fim"] - m["inicio"]) * len(b) / total
            saida.append((ini, ini + dur, b))
            ini += dur
    return saida


def imagem_legenda(texto):
    d = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    linhas = quebrar(d, texto, FONTE_LEG, 1500)
    if len(linhas) == 2:
        ws = texto.split()
        k = min(range(1, len(ws)), key=lambda k: abs(d.textlength(" ".join(ws[:k]), font=FONTE_LEG) - d.textlength(" ".join(ws[k:]), font=FONTE_LEG)))
        linhas = [" ".join(ws[:k]), " ".join(ws[k:])]
    larg = int(max(d.textlength(l, font=FONTE_LEG) for l in linhas)) + 64
    alt = 62 * len(linhas) + 30
    img = Image.new("RGBA", (larg, alt), (0, 0, 0, 0))
    di = ImageDraw.Draw(img)
    di.rounded_rectangle((0, 0, larg, alt), radius=22, fill=(15, 23, 30, 200))
    for i, l in enumerate(linhas):
        di.text(((larg - di.textlength(l, font=FONTE_LEG)) / 2, 12 + i * 62), l, font=FONTE_LEG, fill=(255, 255, 255))
    return img


def imagem_rotulo(texto):
    d = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    larg = int(d.textlength(texto, font=FONTE_ROT)) + 70
    img = Image.new("RGBA", (larg + 20, 90), (0, 0, 0, 0))
    sombra = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle((8, 12, larg + 8, 78), radius=33, fill=(0, 0, 0, 90))
    img = Image.alpha_composite(img, sombra.filter(ImageFilter.GaussianBlur(6)))
    di = ImageDraw.Draw(img)
    di.rounded_rectangle((0, 4, larg, 70), radius=33, fill=(255, 179, 0, 255))
    di.text((35, 13), texto, font=FONTE_ROT, fill=(30, 30, 30))
    return img


# ---------------------------------------------------------------- áudio
def ler_mp3(caminho):
    bruto = subprocess.run([FFMPEG, "-v", "error", "-i", str(caminho), "-f", "s16le", "-ac", "1", "-ar", str(TAXA), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(bruto, dtype=np.int16).astype(np.float32)


def suavizar(t):
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- linha do tempo
cenas = []
inicio = 0.0
for c in CFG["cenas"]:
    som = ler_mp3(AUDIO / f"{c['n']:02d}.mp3")
    dur_fala = len(som) / TAXA
    extra = 1.2 if c["n"] in (1, 17) else 0   # a abertura e o fim respiram um pouco mais
    dur = ANTES + dur_fala + DEPOIS + extra
    fotos = fotos_da_ia() if CENAS[c["n"]] == "ia" else CENAS[c["n"]]
    pesos = sum(p for _, p, _ in fotos)
    trechos, ini = [], inicio
    for origem, peso, zoom in fotos:
        d_foto = dur * peso / pesos
        trechos.append({"img": carregar(origem), "ini": ini, "fim": ini + d_foto, "z": zoom.get("z", (1.0, 1.05)), "c": zoom.get("c", (0.5, 0.5))})
        ini += d_foto
    fala_ini = inicio + ANTES + (0.6 if c["n"] == 1 else 0)
    legendas = [(fala_ini + a, fala_ini + b, imagem_legenda(txt)) for a, b, txt in pedacos_da_legenda(c, dur_fala)]
    cenas.append({"n": c["n"], "ini": inicio, "fim": inicio + dur, "trechos": trechos, "som": som, "fala_ini": fala_ini,
                  "legendas": legendas, "rotulo": imagem_rotulo(c["rotulo"]) if c.get("rotulo") else None})
    inicio += dur
TOTAL = inicio
print(f"Duração: {TOTAL:.1f} s ({int(TOTAL // 60)}:{int(TOTAL % 60):02d})")

# a faixa de áudio inteira
pista = np.zeros(int((TOTAL + 1) * TAXA), dtype=np.float32)
for c in cenas:
    a = int(c["fala_ini"] * TAXA)
    pista[a:a + len(c["som"])] += c["som"]
pista = np.clip(pista, -32768, 32767).astype(np.int16)
wav = TMP / "narracao.raw"
wav.write_bytes(pista.tobytes())

todos_trechos = [tr for c in cenas for tr in c["trechos"]]


def quadro_do_trecho(tr, tempo):
    """a foto com o zoom lento (de z0 a z1, mirando o centro c)"""
    p = suavizar(min(1, max(0, (tempo - tr["ini"]) / max(0.01, tr["fim"] - tr["ini"]))))
    z = tr["z"][0] + (tr["z"][1] - tr["z"][0]) * p
    cw, ch = W / z, H / z
    cx = min(max(tr["c"][0] * W, cw / 2), W - cw / 2)
    cy = min(max(tr["c"][1] * H, ch / 2), H - ch / 2)
    if z == 1.0:
        return tr["img"]
    return tr["img"].resize((W, H), Image.BILINEAR, box=(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2))


def quadro(tempo):
    # a foto do momento e, perto da troca, a mistura com a próxima
    i = next((k for k, tr in enumerate(todos_trechos) if tr["ini"] <= tempo < tr["fim"]), len(todos_trechos) - 1)
    tr = todos_trechos[i]
    img = quadro_do_trecho(tr, tempo)
    if i + 1 < len(todos_trechos):
        prox = todos_trechos[i + 1]
        troca = TROCA_CENA if any(c["trechos"][-1] is tr for c in cenas) else TROCA_FOTO
        if tempo > tr["fim"] - troca:
            alfa = suavizar((tempo - (tr["fim"] - troca)) / troca)
            img = Image.blend(img, quadro_do_trecho(prox, prox["ini"]), alfa)
    # fade do começo e do fim do vídeo
    if tempo < 0.6 or tempo > TOTAL - 1.0:
        k = min(tempo / 0.6, (TOTAL - tempo) / 1.0)
        img = Image.blend(Image.new("RGB", (W, H), (255, 255, 255)), img, max(0.0, min(1.0, k)))
    img = img.convert("RGBA")
    c = next((c for c in cenas if c["ini"] <= tempo < c["fim"]), cenas[-1])
    # o rótulo da cena: aparece no começo e some depois de ~5 s
    if c["rotulo"] is not None:
        dt = tempo - c["ini"]
        alfa = min(1, max(0, (dt - 0.3) / 0.4)) * min(1, max(0, (5.6 - dt) / 0.5))
        if alfa > 0:
            r = c["rotulo"].copy()
            r.putalpha(r.getchannel("A").point(lambda v: int(v * alfa)))
            img.alpha_composite(r, (40, H - 300 if False else 118))
    for a, b, leg in c["legendas"]:
        if a - 0.05 <= tempo < b + 0.1:
            img.alpha_composite(leg, ((W - leg.width) // 2, H - leg.height - 46))
            break
    return img.convert("RGB")


SAIDA.mkdir(parents=True, exist_ok=True)
destino = SAIDA / "gestao-jogos-pedagogicos.mp4"
cmd = [FFMPEG, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
       "-f", "s16le", "-ar", str(TAXA), "-ac", "1", "-i", str(wav),
       "-c:v", "libx264", "-preset", "slow", "-crf", "31", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
       "-c:a", "aac", "-b:a", "96k", "-ar", "44100", "-shortest", str(destino)]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
n_quadros = int(TOTAL * FPS)
for k in range(n_quadros):
    proc.stdin.write(quadro(k / FPS).tobytes())
    if k % (FPS * 20) == 0:
        print(f"  {k / FPS:5.0f} s de {TOTAL:.0f}")
proc.stdin.close()
proc.wait()
wav.unlink()

# a capa: a ficha do Miguel com o logo e o título
capa = Image.open(t("06_2")).convert("RGB").resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2))
capa = Image.blend(capa, Image.new("RGB", (W, H), (0, 70, 62)), 0.62)
logo = Image.open(RAIZ / "assets" / "logo-games.webp").convert("RGBA")
logo = logo.resize((int(logo.width * 560 / logo.height), 560), Image.LANCZOS)
fundo_logo = Image.new("RGBA", (logo.width + 80, logo.height + 80), (0, 0, 0, 0))
ImageDraw.Draw(fundo_logo).rounded_rectangle((0, 0, *fundo_logo.size), radius=60, fill=(255, 255, 255, 240))
capa.paste(fundo_logo, (150, (H - fundo_logo.height) // 2), fundo_logo)
capa.paste(logo, (190, (H - logo.height) // 2), logo)
dc = ImageDraw.Draw(capa)
dc.text((820, 330), "Painel de gestão", font=ImageFont.truetype(F + "segoeuib.ttf", 96), fill=(255, 255, 255))
for i, l in enumerate(("Escolas e psicopedagogia acompanhando", "cada criança — com IA que cria", "questionários em segundos")):
    dc.text((825, 470 + i * 62), l, font=ImageFont.truetype(F + "segoeui.ttf", 50), fill=(225, 245, 240))
dc.rounded_rectangle((820, 700, 1250, 780), radius=40, fill=(255, 179, 0))
dc.polygon([(862, 722), (862, 758), (893, 740)], fill=(30, 30, 30))   # o "play" (a fonte não tem o símbolo)
dc.text((912, 712), "Assistir (3 min)", font=ImageFont.truetype(F + "segoeuib.ttf", 40), fill=(30, 30, 30))
capa.save(SAIDA / "capa-gestao.jpg", quality=86)
print(f"Pronto: {destino} ({destino.stat().st_size / 1e6:.1f} MB) e capa-gestao.jpg")
