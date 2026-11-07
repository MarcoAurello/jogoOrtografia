"""Grava as telas do vídeo da gestão (uma ou mais fotos de tela por cena, 1920x1080) com o Playwright no Edge.

Antes: docker compose no ar, python docs/videos/criar-dados-video.py e python docs/videos/pagina-livro.py.
Uso:  python docs/videos/gravar-telas.py            todas as cenas
      python docs/videos/gravar-telas.py 5 6 11     só essas cenas
Saída: docs/videos/tmp/telas/NN_k.png. A cena 11 chama a IA de verdade (gera e salva o questionário "Primeira Guerra
Mundial"); depois dela rode  python docs/videos/criar-dados-video.py --quiz  e grave a cena 13.
As contas vêm do TESTE-LOCAL.md (bloco "Vídeo da gestão"); a senha não aparece na tela (o campo mostra só pontinhos).
"""
import json
import pathlib
import re
import sys
import urllib.request

from playwright.sync_api import sync_playwright

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
SITE = "http://localhost:8089"
TMP = AQUI / "tmp"
TELAS = TMP / "telas"
TELAS.mkdir(parents=True, exist_ok=True)
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
SENHA = re.search(r"senha de todas estas contas: `([^`]+)`",
                  (RAIZ / "TESTE-LOCAL.md").read_text(encoding="utf-8").split("## Vídeo da gestão")[-1]).group(1)
COORD, MARIANA, RENATA = "coordenacao@ceciliameireles.test", "mariana.costa@ceciliameireles.test", "renata.alves@ceciliameireles.test"
CARLA, JULIANA = "carla.souza@exemplo.test", "juliana@espacoaprender.test"


def api(caminho, token=None, corpo=None):
    r = urllib.request.Request(SITE + "/api" + caminho, data=json.dumps(corpo).encode() if corpo else None,
                               headers={"Content-Type": "application/json", **({"Authorization": "Bearer " + token} if token else {})})
    return json.loads(urllib.request.urlopen(r).read())


TOKENS = {}


def token(email):
    if email not in TOKENS:
        TOKENS[email] = api("/sessions", corpo={"email": email, "senha": SENHA})["token"]
    return TOKENS[email]


tk_m = token(MARIANA)
TURMAS = {t["nome"]: t for t in api("/turmas", tk_m) + api("/turmas", token(RENATA))}
ALUNOS = {a["nome"]: a for a in api("/alunos", tk_m)}
MIGUEL, ANA = ALUNOS["Miguel Ferreira"], ALUNOS["Ana Clara Souza"]


class Gravador:
    def __init__(self, pg):
        self.pg = pg
        self.cena = 0
        self.k = 0

    def comecar(self, n):
        self.cena, self.k = n, 0
        for velho in TELAS.glob(f"{n:02d}_*.png"):
            velho.unlink()
        print(f"cena {n}")

    def foto(self, espera=900):
        self.pg.wait_for_timeout(espera)
        # no vídeo aparece o endereço de produção, não o localhost
        self.pg.evaluate("""() => {
          const troca = (t) => t.replaceAll('http://localhost:8089', 'https://gamespedagogicos.store');
          const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          while (w.nextNode()) if (w.currentNode.nodeValue.includes('localhost')) w.currentNode.nodeValue = troca(w.currentNode.nodeValue);
          for (const i of document.querySelectorAll('input, textarea')) if (i.value.includes('localhost')) i.value = troca(i.value);
        }""")
        self.k += 1
        self.pg.screenshot(path=str(TELAS / f"{self.cena:02d}_{self.k}.png"))

    def entrar(self, email):
        """login sem digitar: o token vai direto para o armazenamento do navegador (a gestão e o app usam o mesmo)"""
        self.pg.goto(SITE + "/gestao/login")
        self.pg.evaluate(f"localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pleno-ortografia:token', {json.dumps(token(email))})")

    def ir(self, caminho, espera=1800):
        self.pg.goto(SITE + "/gestao" + caminho)
        self.pg.wait_for_load_state("networkidle")
        self.pg.wait_for_timeout(espera)

    def destacar(self, alvo):
        """um contorno amarelo no botão que a narração cita (o clique não aparece na foto)"""
        alvo.evaluate("el => { el.style.transition = 'none'; el.style.boxShadow = '0 0 0 4px #ffb300, 0 0 0 12px rgba(255,179,0,.35)'; "
                      "el.style.borderRadius = el.style.borderRadius || '12px'; }")

    def rolar_ate(self, alvo, folga=90):
        alvo.evaluate(f"el => window.scrollTo({{ top: el.getBoundingClientRect().top + window.scrollY - {folga}, behavior: 'instant' }})")
        self.pg.wait_for_timeout(500)


def botao(pg, texto):
    return pg.get_by_role("button", name=texto).first


# ---------------------------------------------------------------- cenas
def cena1(g):
    pg = g.pg
    pg.goto(SITE + "/gestao/login")
    pg.evaluate("localStorage.clear()")
    pg.reload()
    pg.wait_for_timeout(1500)
    g.foto()
    pg.get_by_label("E-mail").fill(MARIANA)
    pg.get_by_label("Senha").first.fill(SENHA)   # campo de senha: na foto só aparecem pontinhos
    g.destacar(botao(pg, "Entrar"))
    g.foto(400)


def cena2(g):
    # a lista de jogos do app, como o aluno vê: entra com o código da turma e o nome
    pg = g.pg
    pg.goto(SITE + "/")
    pg.evaluate("localStorage.clear(); sessionStorage.clear()")
    pg.goto(SITE + "/")
    pg.wait_for_timeout(1500)
    pg.click("#btn-menu-turma", force=True) if pg.locator("#btn-menu-turma").is_visible() else (pg.click("text=☰ Menu"), pg.click("#btn-menu-turma"))
    pg.fill("#turma-codigo", TURMAS["3º ano B"]["codigo"])
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(1500)
    pg.fill("#turma-nome-digitado", "Helena Martins")
    pg.click("#btn-turma-nome")
    pg.wait_for_timeout(2500)
    if not pg.locator("#tela-jogos").is_visible():
        pg.evaluate("document.querySelector('[data-aba=jogos]')?.click()")
        pg.wait_for_timeout(1500)
    g.foto()
    pg.mouse.wheel(0, 420)
    g.foto(1200)


def cena3(g):
    g.entrar(COORD)
    g.ir("/")
    g.foto()
    g.entrar(MARIANA)
    g.ir(f"/turmas/{TURMAS['3º ano B']['id']}")
    g.pg.get_by_role("tab", name="Últimas partidas").click()
    g.foto(1500)


def cena4(g):
    g.entrar(MARIANA)
    g.ir("/turmas")
    g.foto()
    g.ir(f"/turmas/{TURMAS['3º ano B']['id']}")
    g.destacar(g.pg.get_by_text(TURMAS["3º ano B"]["codigo"], exact=True).first)
    g.foto()


def cena5(g):
    g.entrar(MARIANA)
    g.ir(f"/turmas/{TURMAS['3º ano B']['id']}/painel")
    g.foto()
    g.rolar_ate(g.pg.get_by_text("Acerto por semana").first, 40)
    g.foto()


def cena6(g):
    g.entrar(MARIANA)
    g.ir(f"/ficha/{MIGUEL['id']}")
    g.foto()
    g.rolar_ate(g.pg.get_by_text("Evolução", exact=True).first, 30)
    linha = g.pg.get_by_text("Atenção sustentada", exact=True).first
    g.destacar(linha.locator("xpath=.."))
    g.foto()


def cena7(g):
    pg = g.pg
    g.entrar(MARIANA)
    g.ir("/anamnese")
    g.destacar(pg.get_by_text("Ana Clara Souza", exact=True).first.locator("xpath=ancestor::*[contains(@class,'MuiCard-root') or contains(@class,'MuiPaper-root')][1]"))
    g.foto()
    g.ir(f"/aluno/{ANA['id']}")
    g.foto()
    pg.get_by_text("Mandar link para a família").first.click()
    pg.wait_for_timeout(1200)
    # o popup pode pedir o modelo antes de gerar
    for nome in ("Gerar link", "Gerar o link", "Criar link"):
        b = pg.get_by_role("button", name=nome)
        if b.count() and b.first.is_visible():
            b.first.click()
            break
    pg.wait_for_timeout(1500)
    w = pg.get_by_role("button", name=re.compile("WhatsApp")).or_(pg.get_by_role("link", name=re.compile("WhatsApp")))
    if w.count():
        g.destacar(w.first)
    g.foto()


def cena8(g):
    pg = g.pg
    g.entrar(MARIANA)
    g.ir(f"/aluno/{MIGUEL['id']}?aba=plano")
    g.foto()
    pg.get_by_role("link", name=re.compile("Abrir e editar")).first.click()
    pg.wait_for_timeout(2000)
    sug = pg.get_by_role("button", name="Sugerir jogos").first
    g.rolar_ate(sug, 330)
    g.destacar(sug)
    g.foto()
    # as sessões (cronograma e prontuário) ficam no app: o mesmo popup que a professora abre lá
    pg.goto(SITE + "/")
    pg.wait_for_timeout(2000)
    pg.evaluate("for (const id of ['planos-modal','sessoes-modal']) document.body.appendChild(document.getElementById(id))")
    v = re.search(r"main\.js\?v=(\d+)", pg.content()).group(1)
    pg.evaluate(f"async (a) => {{ const m = await import('/js/planos.js?v={v}'); m.abrirPlanos(a, document.body); }}", MIGUEL)
    pg.wait_for_timeout(2000)
    pg.locator("#planos-modal button", has_text="Sessões").first.click()
    g.foto(2200)


def cena9(g):
    pg = g.pg
    g.entrar(RENATA)
    g.ir("/questionarios")
    g.foto()
    g.ir("/questionarios/novo")
    b = botao(pg, "Gerar com IA (foto ou PDF)")
    g.destacar(b)
    g.foto()
    b.click()
    g.foto(1200)


def popup_ia(g):
    pg = g.pg
    g.entrar(RENATA)
    g.ir("/questionarios/novo")
    botao(pg, "Gerar com IA (foto ou PDF)").click()
    pg.wait_for_timeout(800)
    pg.locator("input[type=file][multiple]").set_input_files(str(TMP / "pagina-livro.jpg"))
    pg.wait_for_timeout(2500)
    pg.get_by_role("button", name="10", exact=True).click()
    pg.get_by_label("Ano/série (opcional)").fill("5º ano")
    pg.get_by_label("Tema (opcional)").fill("Primeira Guerra Mundial")
    mat = pg.get_by_label("Matéria (opcional)")
    mat.click()
    pg.wait_for_timeout(400)
    op = pg.get_by_role("option", name="História")
    if op.count():
        op.first.click()
    else:
        pg.keyboard.press("Escape")
    pg.wait_for_timeout(600)


def cena10(g):
    # a primeira imagem da cena é o celular fotografando (tmp/celular-foto.png, montado na edição)
    popup_ia(g)
    g.foto()
    g.destacar(g.pg.get_by_role("button", name=re.compile(r"^Gerar 10 perguntas")).first)
    g.foto(300)


def cena11(g):
    pg = g.pg
    popup_ia(g)
    pg.get_by_role("button", name=re.compile(r"^Gerar 10 perguntas")).first.click()
    # o progresso: uma foto a cada ~1,5 s até o editor aparecer com as perguntas
    for _ in range(80):
        g.foto(1500)
        if pg.get_by_label("Resposta certa").count() >= 5:
            break
    g.foto(1500)
    pg.mouse.wheel(0, 380)
    g.foto(900)


def cena12(g):
    # continua do editor da cena 11 (mesma página): ajusta a 1ª pergunta e salva
    pg = g.pg
    pg.evaluate("window.scrollTo(0, 0)")
    titulo = pg.get_by_label("Nome do questionário")
    titulo.fill("Primeira Guerra Mundial")
    primeira = pg.get_by_role("textbox", name="Pergunta", exact=True).first
    g.rolar_ate(primeira, 260)
    primeira.click()
    pg.keyboard.press("Control+A")
    pg.keyboard.type("Por que as potências europeias formaram dois blocos militares no início do século XX?", delay=15)
    g.destacar(primeira.locator("xpath=ancestor::*[contains(@class,'MuiTextField-root')][1]"))
    g.foto()
    salvar = pg.get_by_role("button", name=re.compile("^Salvar")).last
    salvar.scroll_into_view_if_needed()
    g.destacar(salvar)
    g.foto(500)
    salvar.click()
    pg.wait_for_timeout(2500)
    g.foto()


def cena13(g):
    pg = g.pg
    g.entrar(RENATA)
    g.ir("/competicoes")
    g.foto()
    card = pg.get_by_text("Quiz da Primeira Guerra — 5º ano A").first.locator("xpath=ancestor::*[contains(@class,'MuiCard-root') or contains(@class,'MuiPaper-root')][1]")
    card.get_by_role("button", name="Ranking").click()
    g.foto(2000)


def cena14(g):
    pg = g.pg
    g.entrar(COORD)
    g.ir("/familias")
    g.destacar(pg.get_by_text("WhatsApp", exact=True).first.locator("xpath=ancestor-or-self::*[self::button or self::a][1]"))
    g.foto()
    g.rolar_ate(pg.get_by_text("O que a família vê").first, 40)
    g.foto()


def cena15(g):
    pg = g.pg
    g.entrar(CARLA)
    g.ir("/familia")
    g.foto()
    g.ir(f"/familia/{ANA['id']}")
    g.foto()
    pg.get_by_role("tab", name=re.compile("Recados")).click()
    g.foto(1500)


def cena16(g):
    g.entrar(JULIANA)
    g.ir("/")
    g.foto()
    g.ir("/anamnese")
    g.foto()
    g.ir("/familias")
    g.foto()


CENAS = {i: globals()[f"cena{i}"] for i in range(1, 17)}
pedidas = [int(x) for x in sys.argv[1:]] or list(CENAS)
with sync_playwright() as p:
    nav = p.chromium.launch(channel="msedge")
    ctx = nav.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1.5, locale="pt-BR")
    g = Gravador(ctx.new_page())
    for n in pedidas:
        if n == 12 and 11 not in pedidas:
            print("a cena 12 continua da 11: grave as duas juntas (11 12)")
            continue
        g.comecar(n)
        try:
            CENAS[n](g)
        except Exception as e:
            print(f"  ERRO na cena {n}: {str(e)[:400]}")
            g.foto(0)
    nav.close()
print("Telas em", TELAS)
