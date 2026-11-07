"""Cria os dados FICTÍCIOS do vídeo da gestão (docs/videos/roteiro-gestao.md), pela API, com as mesmas regras do app.

Escola Municipal Cecília Meireles (coordenação, Profª Mariana Costa, Profª Renata Alves, 2º ano A, 3º ano B, 5º ano A),
alunos com partidas de 6 semanas (o Miguel com a atenção sustentada mais fraca), anamnese da Ana Clara (respondida pela
mãe pelo link), plano de objetivos com sessões, questionários, competição da tabuada com ranking, a responsável Carla
Souza (recado e chaves do que a família vê) e a psicopedagoga avulsa "Espaço Aprender — Juliana Rocha" com pacientes.

Uso (com o sistema no ar):
  python docs/videos/criar-dados-video.py            cria tudo (se a escola já existir, para)
  python docs/videos/criar-dados-video.py --quiz     depois de salvar o questionário "Primeira Guerra Mundial" (gerado
                                                     pela IA na gravação): cria a competição do 5º ano A com ranking
Lê ADMIN_EMAIL e ADMIN_SENHA do .env. As contas e a senha vão para o TESTE-LOCAL.md (fora do git); o script de gravação
(gravar-telas.py) lê de lá. Todos os nomes são inventados.
"""
import json
import pathlib
import random
import re
import secrets
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SITE = "http://localhost:8089"
API = f"{SITE}/api"
ENV = dict(l.split("=", 1) for l in (RAIZ / ".env").read_text(encoding="utf-8").splitlines() if "=" in l and not l.strip().startswith("#"))
ARQ_CONTAS = RAIZ / "TESTE-LOCAL.md"
SLUG = "ceciliaMeireles"
random.seed(7)   # os mesmos números a cada vez (o vídeo fica igual se precisar refazer)
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
agora = datetime.now(timezone.utc)


def chamar(caminho, metodo="GET", corpo=None, token=None, escola=None):
    pedido = urllib.request.Request(API + caminho, method=metodo, data=json.dumps(corpo).encode() if corpo is not None else None,
                                    headers={**({"Content-Type": "application/json"} if corpo is not None else {}),
                                             **({"Authorization": f"Bearer {token}"} if token else {}),
                                             **({"X-Escola": escola} if escola else {})})
    try:
        with urllib.request.urlopen(pedido, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {}


def exigir(s, r, o_que, esperado=(200, 201)):
    if s not in esperado:
        raise SystemExit(f"Falhou: {o_que} → {s} {r}")
    return r


def entrar(email, senha):
    return chamar("/sessions", "POST", {"email": email, "senha": senha})[1].get("token")


def contas_salvas():
    """a senha e os e-mails da última criação (bloco 'Vídeo da gestão' do TESTE-LOCAL.md)"""
    texto = ARQ_CONTAS.read_text(encoding="utf-8") if ARQ_CONTAS.exists() else ""
    bloco = texto.split("## Vídeo da gestão")[-1] if "## Vídeo da gestão" in texto else ""
    senha = re.search(r"senha de todas estas contas: `([^`]+)`", bloco)
    return (senha.group(1) if senha else None), bloco


# habilidades de cada jogo (as mesmas de js/habilidades.js)
JOGOS = {
    "tabuada": ("Tetris da Tabuada", ["matematica", "velocidade", "seletiva", "autocontrole"]),
    "fracoes": ("Pizzaria das Frações", ["matematica", "percepcao", "logico", "motoraFina"]),
    "ortografia": ("Jogo de Ortografia", ["linguagem", "fonologica", "seletiva", "autoeficacia"]),
    "giro": ("Giro Imaginário", ["espacial", "memoria", "lateralidade", "percepcao"]),
    "rotina": ("Rotina Certa", ["planejamento", "logico", "linguagem"]),
    "pilhas": ("Pilhas de Cores", ["planejamento", "logico", "frustracao", "espacial"]),
    "setas": ("Setas e Cores", ["alternada", "memoria", "velocidade", "flexibilidade", "inibitorio"]),
    "copia": ("Copie Certo", ["percepcao", "espacial", "logico", "seletiva"]),
    "dinos": ("Memória dos Dinossauros", ["memoria", "seletiva", "percepcao"]),
    # os de atenção sustentada (o sinal do Miguel)
    "escondida": ("Palavra Escondida", ["seletiva", "velocidade", "sustentada", "linguagem"]),
    "bichos": ("Memória dos Bichos", ["memoria", "sustentada", "seletiva", "percepcao"]),
    "reflexo": ("Jogo do Reflexo", ["memoria", "inibitorio", "velocidade", "sustentada", "autoeficacia"]),
    "fichas": ("Fichas Coloridas", ["matematica", "planejamento", "decisao", "sustentada"]),
}
SUSTENTADA = {"escondida", "bichos", "reflexo", "fichas"}
ERROS = {"tabuada": "7 × 8", "fracoes": "3/4 da pizza", "ortografia": "exceção", "escondida": "palavra no fim da linha",
         "bichos": "ordem dos bichos", "reflexo": "sequência de 5 luzes", "fichas": "troco de R$ 7", "giro": "giro anti-horário",
         "rotina": "ordem do banho", "pilhas": "pilha de 4 cores", "setas": "troca de regra", "copia": "peça girada", "dinos": "dino repetido"}


def jogar(token, perfil_aluno, semanas=6, por_semana=3, competicao=None):
    """partidas espalhadas pelas últimas semanas, melhorando aos poucos; perfil_aluno(jogo, semana) → acertos de 0 a 10"""
    gravadas = 0
    for sem in range(semanas):
        for k in range(por_semana):
            jogo = random.choice(list(JOGOS))
            nome, habs = JOGOS[jogo]
            acertos = max(1, min(10, perfil_aluno(jogo, sem)))
            quando = agora - timedelta(days=(semanas - sem) * 7 - k * 2, hours=random.randint(0, 5))
            s, _ = chamar("/partidas", "POST", {
                "id": str(uuid.uuid4()), "jogo": jogo, "titulo": nome, "acertos": acertos, "total": 10,
                "estrelas": 3 if acertos >= 9 else 2 if acertos >= 7 else 1, "jogada_em": quando.isoformat(),
                "habilidades": habs, "resumo": [f"Acertou {acertos} de 10."], "duracao_s": random.randint(150, 420), "nivel_max": 1 + sem // 2,
                "detalhes": [{"tipo": "t", "titulo": "Rodada", "certa": "ok", "erros": [] if acertos >= 9 else [ERROS[jogo]], "nivel": 1 + sem // 2,
                              "tempo": random.randint(4, 12)}],
                **({"competicao": competicao} if competicao else {})}, token)
            gravadas += s == 201
    return gravadas


def aluno_comum(base):
    return lambda jogo, sem: base + sem // 2 + random.randint(-1, 1)


def miguel(jogo, sem):
    # vai bem em raciocínio e matemática; nos jogos que pedem atenção por muito tempo, cai bastante
    return (4 + random.randint(-1, 1) + (sem >= 4)) if jogo in SUSTENTADA else 8 + random.randint(0, 1)


def entrar_aluno(turma, nome=None, aluno_id=None, pin=None):
    corpo = {"codigo": turma["codigo"], **({"nome": nome} if nome else {}), **({"aluno_id": aluno_id} if aluno_id else {}), **({"pin": pin} if pin else {})}
    s, r = chamar("/sessions/aluno", "POST", corpo)
    return exigir(s, r, f"aluno {nome or aluno_id} entra na turma")["token"]


def resultados(comp, turma, nomes, faixa, slug):
    """cada aluno joga a competição de 1 a 3 vezes (no ranking fica a maior nota)"""
    for n in nomes:
        tok = entrar_aluno(turma, nome=n)
        lista = chamar("/sessions/aluno/competicoes", token=tok)[1].get("lista", [])
        cod = next(x["codigo"] for x in lista if x["id"] == comp["id"])
        for _ in range(random.randint(1, 3)):
            acertos = random.randint(*faixa)
            chamar("/dados", "POST", {"acao": "resultadoCompeticao", "escola": slug, "id": comp["id"], "codigo": cod, "nome": n,
                                      "pontos": acertos * 100 + random.randint(0, 90), "acertos": acertos, "total": 10, "config": comp["jogoNome"]})


# ---------------- --quiz: a competição do questionário gerado pela IA ----------------
if "--quiz" in sys.argv:
    senha, bloco = contas_salvas()
    if not senha:
        raise SystemExit("Rode primeiro sem --quiz (não achei as contas do vídeo no TESTE-LOCAL.md).")
    renata = entrar("renata.alves@ceciliameireles.test", senha)
    quizzes = chamar(f"/dados?acao=questionarios&escola={SLUG}")[1].get("lista", [])
    quiz = next((q for q in quizzes if q["titulo"].lower().startswith("primeira guerra")), None)
    if not quiz:
        raise SystemExit("Salve antes o questionário 'Primeira Guerra Mundial' (é o da cena da IA).")
    turma = next(t for t in chamar("/turmas", token=renata)[1] if t["nome"] == "5º ano A")
    s, r = chamar("/planilha", "POST", {"acao": "criarCompeticao", "turma": turma["id"], "nome": "Quiz da Primeira Guerra — 5º ano A",
                                        "jogo": f"quiz:{quiz['id']}", "jogoNome": f"Questionário: {quiz['titulo']}",
                                        "encerra": (agora + timedelta(days=2)).isoformat()}, renata)
    comp = exigir(s, r, "competição do quiz")["competicao"]
    nomes = [a["nome"] for a in chamar(f"/turmas/{turma['id']}/alunos", token=renata)[1]["alunos"]]
    resultados(comp, turma, nomes[:10], (5, 10), SLUG)
    print(f"Competição criada: {comp['nome']} ({len(nomes[:10])} alunos no ranking)")
    sys.exit(0)

# ---------------- criação ----------------
adm = entrar(ENV.get("ADMIN_EMAIL", ""), ENV.get("ADMIN_SENHA", ""))
if not adm:
    raise SystemExit("O administrador não entrou: confira ADMIN_EMAIL e ADMIN_SENHA no .env.")
if any(e["slug"] == SLUG for e in chamar("/escolas", token=adm)[1]):
    raise SystemExit("A Escola Municipal Cecília Meireles já existe (apague no banco para recriar).")

SENHA = "demo-" + secrets.token_hex(4)   # a mesma para todas as contas do vídeo (vai só para o TESTE-LOCAL.md)
PIN_ANA = "".join(random.sample("356789", 4))


def criar_usuario(token, nome, email, perfil, escola_id=None):
    corpo = {"nome": nome, "email": email, "senha": "provisoria-123", "perfil": perfil, **({"escola_id": escola_id} if escola_id else {})}
    s, r = chamar("/usuarios", "POST", corpo, token)
    exigir(s, r, f"criar {email}")
    t = entrar(email, "provisoria-123")
    chamar("/usuarios/eu/senha", "PUT", {"senhaAtual": "provisoria-123", "novaSenha": SENHA}, t)
    return {"id": r["id"], "nome": nome, "email": email, "token": entrar(email, SENHA)}


print("• Escola Municipal Cecília Meireles")
s, escola = chamar("/escolas", "POST", {"slug": SLUG, "nome": "Escola Municipal Cecília Meireles", "slogan": "Aprender brincando, todos juntos",
                                        "cor": "#00796b", "destaque": "#ffb300"}, adm)
exigir(s, escola, "criar a escola")
chamar(f"/escolas/{escola['id']}", "PUT", {"plano": "ativo"}, adm)
coord = criar_usuario(adm, "Coordenação Cecília Meireles", "coordenacao@ceciliameireles.test", "coordenacao", escola["id"])
mariana = criar_usuario(coord["token"], "Mariana Costa", "mariana.costa@ceciliameireles.test", "professor")
renata = criar_usuario(coord["token"], "Renata Alves", "renata.alves@ceciliameireles.test", "professor")
for p in (mariana, renata):
    chamar("/planilha", "POST", {"acao": "adicionarEmail", "nome": p["nome"], "email": p["email"]}, coord["token"])

print("• Turmas e alunos")
t2a = exigir(*chamar("/turmas", "POST", {"nome": "2º ano A", "professores": [mariana["id"]]}, coord["token"]), "turma 2º ano A")
t3b = exigir(*chamar("/turmas", "POST", {"nome": "3º ano B"}, mariana["token"]), "turma 3º ano B")
t5a = exigir(*chamar("/turmas", "POST", {"nome": "5º ano A"}, renata["token"]), "turma 5º ano A")
ALUNOS = {
    "2º ano A": (t2a, mariana, ["Beatriz Rocha", "Gabriel Santos", "Manuela Dias", "Rafael Carvalho", "Valentina Moura", "Enzo Barbosa", "Lívia Teixeira", "Heitor Mendes"]),
    "3º ano B": (t3b, mariana, ["Miguel Ferreira", "Helena Martins", "Davi Oliveira", "Alice Cardoso", "Bernardo Pinto", "Cecília Araújo", "Theo Nascimento",
                               "Isadora Freitas", "Samuel Correia", "Lorena Batista", "Lucas Pereira"]),
    "5º ano A": (t5a, renata, ["Laura Ribeiro", "Pedro Henrique Lima", "Sofia Almeida", "Arthur Gomes", "Mariana Lopes", "João Vitor Reis", "Clara Monteiro",
                               "Nicolas Farias", "Giovanna Prado", "Matheus Duarte", "Yasmin Rezende"]),
}
for nome_turma, (t, prof, nomes) in ALUNOS.items():
    exigir(*chamar(f"/turmas/{t['id']}/alunos", "POST", {"nomes": nomes}, prof["token"]), f"alunos do {nome_turma}")

print("• Família: Carla Souza cadastra a Ana Clara pela página da escola")
chamar("/cadastro-familia/config", "PUT", {"aceita": True}, coord["token"])
chamar("/visivel-familia", "PUT", {"jogos": True, "recados": True, "plano": True, "anamnese": False}, coord["token"])
s, r = chamar(f"/cadastro-familia/publico/escola/{SLUG}", "POST", {
    "nome": "Carla Souza", "email": "carla.souza@exemplo.test", "senha": SENHA, "parentesco": "Mãe", "consentimento": True,
    "filhos": [{"nome": "Ana Clara Souza", "nome_completo": "Ana Clara Souza", "data_nascimento": "2018-03-14", "pin": PIN_ANA, "pin_confirmacao": PIN_ANA}]})
ana_id = exigir(s, r, "cadastro da Carla")["alunos"][0]["id"]
carla_tok = entrar("carla.souza@exemplo.test", SENHA)
exigir(*chamar(f"/alunos/{ana_id}", "PUT", {"turmas": [t3b["id"]]}, coord["token"]), "Ana Clara no 3º ano B")

print("• Partidas (6 semanas)")
total = 0
for nome_turma, (t, prof, nomes) in ALUNOS.items():
    for i, n in enumerate(nomes):
        if i == len(nomes) - 1:
            continue   # o último da lista ainda não jogou (aparece em "sem jogar" no painel)
        tok = entrar_aluno(t, nome=n)
        total += jogar(tok, miguel if n == "Miguel Ferreira" else aluno_comum(random.randint(5, 7)))
tok_ana = entrar_aluno(t3b, aluno_id=ana_id, pin=PIN_ANA)
total += jogar(tok_ana, aluno_comum(6))
print(f"  {total} partidas")

print("• Anamnese da Ana Clara (respondida pela mãe pelo link)")
perguntas = [
    {"tipo": "simnao", "texto": "A gestação e o parto foram tranquilos?", "obrigatoria": True},
    {"tipo": "multipla", "texto": "Como é o sono da criança?", "opcoes": ["Tranquilo", "Agitado", "Acorda à noite"]},
    {"tipo": "escala", "texto": "Quanto ela consegue manter a atenção nas tarefas de casa? (1 a 5)"},
    {"tipo": "simnao", "texto": "Já fez acompanhamento com fonoaudiologia, psicologia ou psicopedagogia?"},
    {"tipo": "longa", "texto": "Do que ela mais gosta de brincar?"},
    {"tipo": "longa", "texto": "O que a família percebe na leitura e na escrita?"},
]
modelo = exigir(*chamar("/anamneses/modelos", "POST", {"titulo": "Anamnese psicopedagógica", "perguntas": perguntas}, coord["token"]), "modelo de anamnese")
q = {p["texto"]: p["id"] for p in modelo["perguntas"]}
link = exigir(*chamar(f"/alunos/{ana_id}/anamneses/link", "POST", {"modelo_id": modelo["id"]}, mariana["token"]), "link da anamnese")
exigir(*chamar(f"/anamnese-publica/{link['token']}", "POST", {"respondida_por_nome": "Carla Souza (mãe)", "consentimento": True, "respostas": {
    q["A gestação e o parto foram tranquilos?"]: "sim", q["Como é o sono da criança?"]: "Tranquilo",
    q["Quanto ela consegue manter a atenção nas tarefas de casa? (1 a 5)"]: 3,
    q["Já fez acompanhamento com fonoaudiologia, psicologia ou psicopedagogia?"]: "nao",
    q["Do que ela mais gosta de brincar?"]: "Desenhar, montar quebra-cabeças e brincar de escolinha com as bonecas.",
    q["O que a família percebe na leitura e na escrita?"]: "Ela lê devagar e às vezes troca letras parecidas, como p e b. Gosta quando lemos juntas antes de dormir."}}),
    "a mãe responde a anamnese")

print("• Planos de objetivos e sessões")
miguel_id = next(a["id"] for a in chamar(f"/turmas/{t3b['id']}/alunos", token=mariana["token"])[1]["alunos"] if a["nome"] == "Miguel Ferreira")
plano_miguel = exigir(*chamar(f"/alunos/{miguel_id}/planos", "POST", {
    "ciclo": "4º bimestre", "status": "ativo",
    "objetivos": [{"area": "Funções executivas", "descricao": "Manter a atenção nas tarefas por 10 minutos seguidos", "habilidades": ["sustentada", "seletiva"],
                   "jogos": ["escondida", "bichos", "reflexo"], "indicador": "70% de acerto nos jogos de atenção", "prazo": "8 semanas", "dias": ["seg", "qua", "sex"]},
                  {"area": "Matemática", "descricao": "Resolver problemas de adição e subtração com reagrupamento", "habilidades": ["matematica", "planejamento"],
                   "jogos": ["fichas", "tabuada"], "indicador": "8 de 10 acertos", "prazo": "6 semanas", "dias": ["ter", "qui"]}],
    "adequacoes_escola": ["Sentar perto da professora", "Dividir as tarefas longas em partes menores"],
    "orientacoes_familia": "Combinar pausas curtas na lição de casa e jogar 15 minutos por dia os jogos indicados."}, mariana["token"]), "plano do Miguel")
sessoes = exigir(*chamar(f"/planos/{plano_miguel['id']}/sessoes", "POST", {"gerar": 8, "inicio": (agora - timedelta(days=21)).date().isoformat(), "a_cada_dias": 7},
                         mariana["token"]), "sessões do Miguel")
notas = [("Começou disperso; com o cronômetro visual ficou 6 minutos na atividade.", 3, 4),
         ("Pediu para repetir a Palavra Escondida. Ficou 8 minutos concentrado.", 4, 4),
         ("Terminou a sequência de luzes sem ajuda pela primeira vez.", 4, 5)]
for sess, (anot, reg, eng) in zip(sessoes, notas):
    chamar(f"/sessoes/{sess['id']}", "PUT", {"status": "realizada", "regulacao": reg, "engajamento": eng, "anotacao": anot}, mariana["token"])
exigir(*chamar(f"/alunos/{ana_id}/planos", "POST", {
    "ciclo": "4º bimestre", "status": "ativo",
    "objetivos": [{"area": "Leitura e escrita", "descricao": "Diferenciar as letras p, b, d e q na leitura", "habilidades": ["fonologica", "linguagem"],
                   "jogos": ["ortografia"], "indicador": "80% de acerto", "prazo": "8 semanas", "dias": ["seg", "qua"]}],
    "orientacoes_familia": "Ler juntas 10 minutos por dia e apontar as letras parecidas."}, mariana["token"]), "plano da Ana Clara")
exigir(*chamar(f"/alunos/{ana_id}/recados", "POST", {"texto": "A Ana Clara foi muito bem no jogo de ortografia esta semana! Continuem a leitura juntas em casa. 📚"},
               mariana["token"]), "recado")

print("• Questionários")
SILABAS = [("Quantas sílabas tem a palavra BORBOLETA?", "4", ["3", "5"]), ("Qual palavra rima com GATO?", "PATO", ["BOLA", "CASA"]),
           ("Qual é a primeira sílaba de MACACO?", "MA", ["CA", "CO"]), ("Qual palavra rima com JANELA?", "PANELA", ["JARDIM", "LIVRO"]),
           ("Quantas sílabas tem a palavra SOL?", "1", ["2", "3"])]
FRACOES = [("Uma pizza foi cortada em 8 pedaços e você comeu 3. Que fração você comeu?", "3/8", ["3/5", "5/8"]),
           ("Metade de uma barra de chocolate é igual a:", "1/2", ["1/3", "2/3"]),
           ("Qual fração é maior?", "3/4", ["1/4", "2/4"]),
           ("Em uma receita, usa-se 1/4 de xícara de açúcar duas vezes. Quanto açúcar no total?", "1/2 xícara", ["1/8 de xícara", "2/8 de xícara"]),
           ("De 12 laranjas, 1/3 estão maduras. Quantas laranjas estão maduras?", "4", ["3", "6"])]
for titulo, prof, lista in (("Sílabas e rimas", mariana, SILABAS), ("Frações do dia a dia", renata, FRACOES)):
    exigir(*chamar("/planilha", "POST", {"acao": "salvarQuestionario", "titulo": titulo,
                                         "perguntas": [{"pergunta": p, "certa": c, "erradas": e} for p, c, e in lista]}, prof["token"]), titulo)

print("• Competição: Desafio da Tabuada — 3º ano B")
s, r = chamar("/planilha", "POST", {"acao": "criarCompeticao", "turma": t3b["id"], "nome": "Desafio da Tabuada — 3º ano B", "jogo": "tabuada",
                                    "jogoNome": "Tetris da Tabuada", "encerra": (agora + timedelta(days=2)).isoformat()}, mariana["token"])
comp = exigir(s, r, "competição da tabuada")["competicao"]
resultados(comp, t3b, ALUNOS["3º ano B"][2][:9], (4, 10), SLUG)

print("• Psicopedagoga avulsa: Espaço Aprender — Juliana Rocha")
juliana = criar_usuario(adm, "Juliana Rocha (Espaço Aprender)", "juliana@espacoaprender.test", "professor")
chamar("/cadastro-familia/config", "PUT", {"aceita": True}, juliana["token"])
chamar("/visivel-familia", "PUT", {"jogos": True, "recados": True, "plano": True}, juliana["token"])
cfg = chamar("/cadastro-familia/config", token=juliana["token"])[1]
apelido = cfg.get("caminho", "").rsplit("/", 1)[-1]
pacientes = []
for resp, email, filho, nasc in (("Patrícia Moreira", "patricia.moreira@exemplo.test", "Benício Moreira", "2017-07-02"),
                                 ("Rodrigo Lopes", "rodrigo.lopes@exemplo.test", "Yasmin Lopes", "2016-11-20"),
                                 ("Fernanda Castro", "fernanda.castro@exemplo.test", "Joaquim Castro", "2018-01-09"),
                                 ("Luciana Vieira", "luciana.vieira@exemplo.test", "Antonella Vieira", "2015-09-30")):
    pin = "".join(random.sample("356789", 4))
    s, r = chamar(f"/cadastro-familia/publico/profissional/{apelido}", "POST", {
        "nome": resp, "email": email, "senha": SENHA, "consentimento": True,
        "filhos": [{"nome": filho, "nome_completo": filho, "data_nascimento": nasc, "pin": pin, "pin_confirmacao": pin}]})
    pac = exigir(s, r, f"paciente {filho}")["alunos"][0]["id"]
    pacientes.append(pac)
    # joga em casa pela conta do responsável (o paciente não tem turma)
    tk_resp = entrar(email, SENHA)
    s, r = chamar(f"/familia/filhos/{pac}/entrar", "POST", {"pin": pin}, tk_resp)
    if s == 200:
        jogar(r["token"], aluno_comum(random.randint(5, 7)), semanas=5, por_semana=2)
modelo_j = exigir(*chamar("/anamneses/modelos", "POST", {"titulo": "Anamnese clínica — Espaço Aprender", "perguntas": perguntas}, juliana["token"]), "modelo da Juliana")
qj = {p["texto"]: p["id"] for p in modelo_j["perguntas"]}
exigir(*chamar(f"/alunos/{pacientes[0]}/anamneses", "POST", {"modelo_id": modelo_j["id"], "consentimento": True, "respostas": {
    qj["A gestação e o parto foram tranquilos?"]: "sim", qj["Como é o sono da criança?"]: "Acorda à noite",
    qj["Quanto ela consegue manter a atenção nas tarefas de casa? (1 a 5)"]: 2,
    qj["Do que ela mais gosta de brincar?"]: "Blocos de montar e futebol."}}, juliana["token"]), "anamnese do paciente")
chamar(f"/alunos/{pacientes[0]}/planos", "POST", {"ciclo": "Atendimento — 2º semestre", "status": "ativo", "objetivos": [
    {"area": "Funções executivas", "descricao": "Planejar as etapas antes de começar a tarefa", "habilidades": ["planejamento", "inibitorio"],
     "jogos": ["pilhas", "rotina"], "indicador": "Completar 3 fases sem ajuda", "prazo": "10 semanas", "dias": ["ter"]}]}, juliana["token"])
chamar(f"/alunos/{pacientes[0]}/recados", "POST", {"texto": "Na próxima sessão vamos usar os jogos de planejamento. Até terça!"}, juliana["token"])

# ---------------- TESTE-LOCAL.md ----------------
linhas = ["", f"## Vídeo da gestão ({agora.strftime('%d/%m/%Y %H:%M')} UTC) — senha de todas estas contas: `{SENHA}`", "",
          "Dados fictícios do vídeo (docs/videos/criar-dados-video.py).", "",
          "| Quem | E-mail | Turmas |", "|---|---|---|",
          f"| Coordenação (Escola Municipal Cecília Meireles, /{SLUG}) | {coord['email']} | todas |",
          f"| Profª Mariana Costa | {mariana['email']} | 2º ano A ({t2a['codigo']}), 3º ano B ({t3b['codigo']}) |",
          f"| Profª Renata Alves | {renata['email']} | 5º ano A ({t5a['codigo']}) |",
          f"| Carla Souza (responsável) | carla.souza@exemplo.test | Ana Clara Souza, PIN {PIN_ANA} |",
          f"| Espaço Aprender — Juliana Rocha (avulsa) | {juliana['email']} | pacientes: Benício, Yasmin, Joaquim, Antonella |", ""]
ARQ_CONTAS.write_text((ARQ_CONTAS.read_text(encoding="utf-8") if ARQ_CONTAS.exists() else "# Contas de teste locais (não vai para o git)\n")
                      + "\n".join(linhas) + "\n", encoding="utf-8")
print("\nPronto. As contas e a senha estão no TESTE-LOCAL.md.")
print("Depois de salvar o questionário da IA: python docs/videos/criar-dados-video.py --quiz")
