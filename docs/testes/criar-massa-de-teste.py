"""Cria uma massa de teste no sistema (pela API, com as mesmas regras do app) e confere quem enxerga o quê.

Cria 3 escolas, cada uma com coordenação, 2 professores, 3 turmas, alunos, partidas (para o painel e a ficha),
competições abertas e encerradas (com ranking) e e-mails dos relatórios; e 1 professor avulso (sem escola) com
a turma dele. Depois confere a regra de acesso:
  - administrador: enxerga tudo;
  - coordenação: só a escola dela;
  - professor: só as turmas dele (e as competições, os alunos, o painel e a ficha dessas turmas).

Uso (com o sistema no ar):  python docs/testes/criar-massa-de-teste.py [http://localhost:8089]
Precisa só do Python 3. Lê ADMIN_EMAIL e ADMIN_SENHA do .env. As contas criadas e a senha delas vão para o
TESTE-LOCAL.md (fora do git). Rodar de novo não duplica: as escolas que já existem são puladas.
"""
import json
import pathlib
import random
import secrets
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SITE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8089").rstrip("/")
API = f"{SITE}/api"
ENV = dict(l.split("=", 1) for l in (RAIZ / ".env").read_text(encoding="utf-8").splitlines() if "=" in l and not l.strip().startswith("#"))
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SENHA = "teste-" + secrets.token_hex(4)   # a mesma para todas as contas desta massa (vai para o TESTE-LOCAL.md)
agora = datetime.now(timezone.utc)
falhas = []


def chamar(caminho, metodo="GET", corpo=None, token=None):
    pedido = urllib.request.Request(API + caminho, method=metodo, data=json.dumps(corpo).encode() if corpo is not None else None,
                                    headers={**({"Content-Type": "application/json"} if corpo is not None else {}),
                                             **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(pedido, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {}


def entrar(email, senha):
    return chamar("/sessions", "POST", {"email": email, "senha": senha})[1].get("token")


def confere(nome, certo, detalhe=""):
    print(("  OK    " if certo else "  FALHA "), nome, f"({detalhe})" if detalhe else "")
    if not certo:
        falhas.append(nome)


def criar_usuario(token, nome, email, perfil, escola_id=None):
    corpo = {"nome": nome, "email": email, "senha": "provisoria-123", "perfil": perfil}
    if escola_id is not None:
        corpo["escola_id"] = escola_id
    s, r = chamar("/usuarios", "POST", corpo, token)
    if s != 201:
        raise SystemExit(f"Não criou {email}: {s} {r}")
    t = entrar(email, "provisoria-123")
    chamar("/usuarios/eu/senha", "PUT", {"senhaAtual": "provisoria-123", "novaSenha": SENHA}, t)
    return {"id": r["id"], "nome": nome, "email": email, "perfil": perfil, "token": entrar(email, SENHA)}


HABS = {"fracoes": ["matematica", "percepcao", "logico"], "tabuada": ["matematica", "memoria", "atencao"],
        "ortografia": ["portugues", "leitura", "atencao"], "giro": ["espacial", "memoria", "lateralidade"]}
NOMES = ["Ana", "Bruno", "Carla", "Davi", "Elisa", "Felipe", "Gabi", "Heitor", "Isis", "João", "Lara", "Miguel", "Nina", "Otávio", "Pietra"]
JOGOS = [("tabuada", "Tetris da Tabuada"), ("fracoes", "Pizzaria das Frações"), ("ortografia", "Jogo de Ortografia")]


def jogar(turma, nome, competicao=None):
    """o aluno entra com o código da turma e o nome e joga 4 partidas em semanas diferentes (para o painel e a ficha)"""
    s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "nome": nome})
    if s != 200:
        return 0
    tok = r["token"]
    base = random.randint(4, 7)
    for i in range(4):
        jogo = random.choice(list(HABS))
        acertos = min(10, base + i)
        chamar("/partidas", "POST", {
            "id": str(uuid.uuid4()), "jogo": jogo, "titulo": jogo.title(), "acertos": acertos, "total": 10,
            "estrelas": 3 if acertos >= 9 else 2 if acertos >= 7 else 1, "jogada_em": (agora - timedelta(days=28 - i * 7)).isoformat(),
            "habilidades": HABS[jogo], "resumo": [f"Acertou {acertos} de 10."],
            "detalhes": [{"tipo": "t", "titulo": "Rodada", "certa": "ok", "erros": [] if acertos >= 9 else ["confundiu a regra"], "nivel": 1, "tempo": 5}],
            **({"competicao": competicao} if competicao else {})}, tok)
    return tok


print(f"Criando a massa de teste em {SITE}\n")
adm = entrar(ENV.get("ADMIN_EMAIL", ""), ENV.get("ADMIN_SENHA", ""))
if not adm:
    raise SystemExit("O administrador não entrou: confira ADMIN_EMAIL e ADMIN_SENHA no .env.")
existentes = {e["slug"] for e in chamar("/escolas", token=adm)[1]}

ESCOLAS = [("colegioAurora", "Colégio Aurora", "#6a1b9a", "#ffb300"), ("escolaHorizonte", "Escola Horizonte", "#0277bd", "#ffca28"),
           ("institutoSaber", "Instituto Saber", "#2e7d32", "#ff7043")]
massa = []   # o que foi criado, para a conferência e o TESTE-LOCAL.md
for slug, nome, cor, destaque in ESCOLAS:
    if slug in existentes:
        print(f"• {nome}: já existe, pulei (apague no banco para recriar)")
        continue
    print(f"• {nome}")
    s, escola = chamar("/escolas", "POST", {"slug": slug, "nome": nome, "slogan": "Escola de teste", "cor": cor, "destaque": destaque}, adm)
    chamar(f"/escolas/{escola['id']}", "PUT", {"plano": "ativo"}, adm)   # sem prazo de teste
    coord = criar_usuario(adm, f"Coordenação {nome}", f"coord@{slug.lower()}.test", "coordenacao", escola["id"])
    profs = [criar_usuario(coord["token"], f"Prof. {n} ({nome.split()[-1]})", f"{n.lower()}@{slug.lower()}.test", "professor") for n in ("Marta", "Paulo")]
    # e-mails dos relatórios da escola
    for p in profs:
        chamar("/planilha", "POST", {"acao": "adicionarEmail", "nome": p["nome"], "email": p["email"]}, coord["token"])
    # turmas: cada professor cria a dele; a coordenação cria uma com os dois professores
    turmas = []
    for p, serie in zip(profs, ("3º ano A", "4º ano B")):
        s, t = chamar("/turmas", "POST", {"nome": serie}, p["token"])
        turmas.append({**t, "professores": [p["id"]]})
    s, t = chamar("/turmas", "POST", {"nome": "5º ano (compartilhada)", "professores": [p["id"] for p in profs]}, coord["token"])
    turmas.append({**t, "professores": [p["id"] for p in profs]})
    # alunos: metade cadastrada pelo professor, metade entra sozinha digitando o nome
    for t in turmas:
        dono = next(p for p in profs if p["id"] in t["professores"])
        nomes = random.sample(NOMES, 6)
        chamar(f"/turmas/{t['id']}/alunos", "POST", {"nomes": [f"{n} {nome[0]}." for n in nomes[:3]]}, dono["token"])
        t["alunos_nomes"] = [f"{n} {nome[0]}." for n in nomes]
        t["dono"] = dono
    # competições: uma aberta e uma encerrada por turma, com ranking
    for t in turmas:
        dono = t["dono"]
        for k, (jogo, jogo_nome) in enumerate(random.sample(JOGOS, 2)):
            s, r = chamar("/planilha", "POST", {"acao": "criarCompeticao", "turma": t["id"], "nome": f"{t['nome']} – {jogo_nome}", "jogo": jogo,
                                                "jogoNome": jogo_nome, "encerra": (agora + timedelta(hours=6)).isoformat(), "email": dono["email"]}, dono["token"])
            comp = r["competicao"]
            for n in t["alunos_nomes"]:
                tok = jogar(t, n, f"{comp['codigo']} · {comp['nome']}") if k == 0 else chamar("/sessions/aluno", "POST", {"codigo": t["codigo"], "nome": n})[1]["token"]
                lista = chamar("/sessions/aluno/competicoes", token=tok)[1]["lista"]
                cod = next(x["codigo"] for x in lista if x["id"] == comp["id"])
                for _ in range(random.randint(1, 3)):   # várias tentativas: no ranking fica a maior nota
                    pontos = random.randint(200, 1200)
                    chamar("/dados", "POST", {"acao": "resultadoCompeticao", "escola": slug, "id": comp["id"], "codigo": cod, "nome": n,
                                              "pontos": pontos, "acertos": pontos // 120, "total": 10, "config": jogo_nome})
            if k == 1:
                chamar("/planilha", "POST", {"acao": "encerrarCompeticao", "id": comp["id"]}, dono["token"])
    massa.append({"slug": slug, "nome": nome, "escola": escola, "coord": coord, "profs": profs, "turmas": turmas})

# professor avulso (sem escola), com a turma e uma competição dele
avulso = None
if not any(u["email"] == "avulso@teste.test" for u in chamar("/usuarios", token=adm)[1]):
    print("• Professor avulso")
    avulso = criar_usuario(adm, "Prof. Rita (avulsa)", "avulso@teste.test", "professor", None)
    s, t = chamar("/turmas", "POST", {"nome": "Reforço particular"}, avulso["token"])
    avulso["turma"] = t
    chamar("/planilha", "POST", {"acao": "criarCompeticao", "turma": t["id"], "nome": "Reforço – Tabuada", "jogo": "tabuada",
                                 "jogoNome": "Tetris da Tabuada", "encerra": (agora + timedelta(hours=6)).isoformat()}, avulso["token"])
    for n in ("Caio R.", "Duda R."):
        jogar(t, n)

# ---------- conferência: quem enxerga o quê ----------
if massa:
    print("\nConferindo o acesso de cada perfil")
    todas_turmas = chamar("/turmas", token=adm)[1]
    ids_massa = {t["id"] for m in massa for t in m["turmas"]}
    confere("administrador vê as turmas de todas as escolas", ids_massa <= {t["id"] for t in todas_turmas}, f"{len(todas_turmas)} turmas")
    confere("administrador vê os usuários de todas as escolas", {m["coord"]["id"] for m in massa} <= {u["id"] for u in chamar("/usuarios", token=adm)[1]})
    for m in massa:
        outras = [x for x in massa if x is not m]
        ids_minhas = {t["id"] for t in m["turmas"]}
        ids_outras = {t["id"] for x in outras for t in x["turmas"]}
        c = m["coord"]["token"]
        vistas = {t["id"] for t in chamar("/turmas", token=c)[1]}
        confere(f"{m['nome']}: coordenação vê todas as turmas da escola", ids_minhas <= vistas)
        confere(f"{m['nome']}: coordenação NÃO vê turmas de outra escola", not (vistas & ids_outras))
        usuarios = chamar("/usuarios", token=c)[1]
        confere(f"{m['nome']}: coordenação só vê usuários da escola", all(u["escola_id"] == m["escola"]["id"] for u in usuarios), f"{len(usuarios)} usuários")
        comps = chamar("/planilha", "POST", {"acao": "competicoesProfessor"}, c)[1].get("lista", [])
        confere(f"{m['nome']}: coordenação vê as competições da escola", len(comps) == 2 * len(m["turmas"]), f"{len(comps)} competições")
        if outras:
            alheia = outras[0]["turmas"][0]
            s, _ = chamar(f"/turmas/{alheia['id']}/alunos", token=c)
            confere(f"{m['nome']}: coordenação NÃO abre os alunos de outra escola", s == 404, s)
            s, _ = chamar(f"/turmas/{alheia['id']}/painel?dias=90", token=c)
            confere(f"{m['nome']}: coordenação NÃO abre o painel de outra escola", s == 404, s)
        for p in m["profs"]:
            minhas = {t["id"] for t in m["turmas"] if p["id"] in t["professores"]}
            vistas = {t["id"] for t in chamar("/turmas", token=p["token"])[1]}
            confere(f"{m['nome']}: {p['nome']} vê só as turmas dele ({len(minhas)})", vistas == minhas, f"vê {len(vistas)}")
            comps = chamar("/planilha", "POST", {"acao": "competicoesProfessor"}, p["token"])[1].get("lista", [])
            turmas_comp = {x["turmaId"] for x in comps}
            confere(f"{m['nome']}: {p['nome']} vê só as competições das turmas dele", turmas_comp <= minhas and len(comps) == 2 * len(minhas), f"{len(comps)} competições")
            alheia = next(t for t in m["turmas"] if p["id"] not in t["professores"])
            s, _ = chamar(f"/turmas/{alheia['id']}/alunos", token=p["token"])
            confere(f"{m['nome']}: {p['nome']} NÃO abre os alunos da turma do colega", s == 404, s)
            s, _ = chamar(f"/turmas/{alheia['id']}/painel?dias=90", token=p["token"])
            confere(f"{m['nome']}: {p['nome']} NÃO abre o painel da turma do colega", s == 404, s)
            minha = next(t for t in m["turmas"] if p["id"] in t["professores"])
            s, painel = chamar(f"/turmas/{minha['id']}/painel?dias=90", token=p["token"])
            confere(f"{m['nome']}: {p['nome']} abre o painel da turma dele (com partidas)", s == 200 and painel["resumo"]["partidas"] > 0,
                    f"{painel.get('resumo', {}).get('partidas')} partidas")
            s, _ = chamar("/usuarios", token=p["token"])
            confere(f"{m['nome']}: {p['nome']} NÃO vê a lista de usuários", s == 403, s)
    if avulso:
        vistas = chamar("/turmas", token=avulso["token"])[1]
        confere("professor avulso vê só a turma dele", [t["id"] for t in vistas] == [avulso["turma"]["id"]], f"vê {len(vistas)}")
        comps = chamar("/planilha", "POST", {"acao": "competicoesProfessor"}, avulso["token"])[1].get("lista", [])
        confere("professor avulso vê só a competição dele", len(comps) == 1, f"{len(comps)}")

# ---------- TESTE-LOCAL.md: as contas criadas ----------
if massa or avulso:
    linhas = ["", f"## Massa de teste ({agora.strftime('%d/%m/%Y %H:%M')} UTC) — senha de todas estas contas: `{SENHA}`", "",
              "| Escola | Perfil | E-mail | Turmas |", "|---|---|---|---|"]
    for m in massa:
        linhas.append(f"| {m['nome']} (/{m['slug']}) | Coordenação | {m['coord']['email']} | todas da escola |")
        for p in m["profs"]:
            linhas.append(f"| {m['nome']} | Professor | {p['email']} | " + ", ".join(f"{t['nome']} ({t['codigo']})" for t in m["turmas"] if p["id"] in t["professores"]) + " |")
    if avulso:
        linhas.append(f"| (sem escola) | Professor avulso | {avulso['email']} | {avulso['turma']['nome']} ({avulso['turma']['codigo']}) |")
    linhas += ["", "Alunos: entram com o código da turma e o nome (ex.: o primeiro nome da lista da turma)."]
    arq = RAIZ / "TESTE-LOCAL.md"
    arq.write_text((arq.read_text(encoding="utf-8") if arq.exists() else "# Contas de teste locais (não vai para o git)\n") + "\n".join(linhas) + "\n", encoding="utf-8")
    print("\nAs contas e a senha estão no TESTE-LOCAL.md.")

print("\nTUDO CERTO" if not falhas else f"\n{len(falhas)} FALHA(S): " + "; ".join(falhas))
