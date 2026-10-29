"""
Teste automático dos fluxos do sistema com login e banco (fases 1 a 4), contra o sistema rodando no Docker.

Não depende de contas de teste: com o administrador do .env, cria uma escola nova (com nome aleatório), a coordenação,
um professor, uma turma e os alunos, e testa tudo dentro dessa escola (não mexe nos dados que já existem).
No fim, a escola de teste fica DESATIVADA (a API não apaga nada).

Como rodar (na pasta do projeto, com o sistema no ar: docker compose up -d):
    python docs/testes/testar-fluxos.py
    python docs/testes/testar-fluxos.py http://localhost:8090      (outro endereço)

Precisa só do Python 3 (sem pacotes extras). Lê ADMIN_EMAIL, ADMIN_SENHA e URL_PLANILHA do arquivo .env.
Termina com "TUDO CERTO" ou com a lista do que falhou (e código de saída 1).
"""

import json
import pathlib
import random
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SITE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8089").rstrip("/")
API = f"{SITE}/api"
ENV = dict(linha.split("=", 1) for linha in (RAIZ / ".env").read_text(encoding="utf-8").splitlines()
           if "=" in linha and not linha.strip().startswith("#"))
falhas = []

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def chamar(caminho, metodo="GET", corpo=None, token=None):
    pedido = urllib.request.Request(
        API + caminho, method=metodo, data=json.dumps(corpo).encode() if corpo is not None else None,
        headers={**({"Content-Type": "application/json"} if corpo is not None else {}),
                 **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(pedido, timeout=120) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {}


def confere(nome, certo, detalhe=""):
    print(("  OK    " if certo else "  FALHA "), nome, f"({detalhe})" if detalhe else "")
    if not certo:
        falhas.append(nome)


def entrar(email, senha):
    s, r = chamar("/sessions", "POST", {"email": email, "senha": senha})
    return r.get("token"), r


def figuras(aluno):
    return [int(x) for x in aluno["senha_figuras"].split(",")]


sufixo = uuid.uuid4().hex[:6]
agora = datetime.now(timezone.utc)
print(f"Testando {SITE} (escola de teste: /teste{sufixo})\n")

# ---------- 0. o sistema está no ar ----------
print("0. Sistema no ar")
s, r = chamar("/health")
confere("API responde", s == 200 and r.get("status") == "ok")
if s != 200:
    print("\nA API não respondeu. Suba o sistema com: docker compose up -d")
    sys.exit(1)

# ---------- 1. administrador e escola (fase 1) ----------
print("1. Administrador e escola")
adm, r = entrar(ENV.get("ADMIN_EMAIL", ""), ENV.get("ADMIN_SENHA", ""))
confere("administrador entra (ADMIN_EMAIL / ADMIN_SENHA do .env)", bool(adm))
if not adm:
    print("\nConfira ADMIN_EMAIL e ADMIN_SENHA no .env (o administrador é criado na primeira subida).")
    sys.exit(1)
slug = f"teste{sufixo}"
s, escola = chamar("/escolas", "POST", {"slug": slug, "nome": f"Escola Teste {sufixo}", "slogan": "Teste automático",
                                       "cor": "#00796b", "destaque": "#ffca28"}, adm)
confere("cria escola com 14 dias de teste", s == 201 and escola.get("plano") == "teste" and not escola.get("bloqueada"))
pagina = urllib.request.urlopen(f"{SITE}/{slug}").read().decode("utf-8")
confere("a página da escola já sai com o nome e a cor", f"Escola Teste {sufixo}" in pagina and "#00796b" in pagina)
s, r = chamar(f"/escolas/{slug}/marca")
confere("marca da escola (pública)", s == 200 and r.get("cor") == "#00796b")
s, r = chamar("/escolas", "POST", {"slug": slug, "nome": "Repetida"}, adm)
confere("endereço repetido é recusado", s == 409)
s, r = chamar("/escolas", "POST", {"slug": "api", "nome": "X"}, adm)
confere("endereço reservado é recusado", s == 400)

# ---------- 2. coordenação e professor (fase 1) ----------
print("2. Coordenação e professor")
email_coord = f"coord.{sufixo}@exemplo.test"
s, r = chamar("/usuarios", "POST", {"nome": "Coordenação Teste", "email": email_coord, "senha": "provisoria1",
                                   "perfil": "coordenacao", "escola_id": escola["id"]}, adm)
confere("administrador cadastra a coordenação", s == 201)
coord, r = entrar(email_coord, "provisoria1")
confere("coordenação entra no 1º acesso (pede senha nova)", bool(coord) and r["usuario"]["primeiro_login"])
s, r = chamar("/usuarios/eu/senha", "PUT", {"senhaAtual": "provisoria1", "novaSenha": "coordenacao2026"}, coord)
confere("troca a senha", s == 200)
coord, r = entrar(email_coord, "coordenacao2026")
confere("entra com a senha nova", bool(coord) and not r["usuario"]["primeiro_login"])
email_prof = f"prof.{sufixo}@exemplo.test"
s, r = chamar("/usuarios", "POST", {"nome": "Professora Teste", "email": email_prof, "senha": "provisoria2", "perfil": "professor"}, coord)
confere("coordenação cadastra professora (na própria escola)", s == 201 and r.get("escola_id") == escola["id"])
s, r = chamar("/usuarios", "POST", {"nome": "X", "email": f"x.{sufixo}@exemplo.test", "senha": "provisoria3", "perfil": "admin"}, coord)
confere("coordenação NÃO cria administrador", s == 403)
prof, _ = entrar(email_prof, "provisoria2")
chamar("/usuarios/eu/senha", "PUT", {"senhaAtual": "provisoria2", "novaSenha": "professora2026"}, prof)
prof, _ = entrar(email_prof, "professora2026")
confere("professora entra", bool(prof))
s, r = chamar("/usuarios", token=prof)
confere("professora NÃO vê a lista de usuários", s == 403)
s, r = chamar("/sessions", "POST", {"email": email_prof, "senha": "errada"})
confere("senha errada é recusada", s == 401)

# ---------- 3. turma e alunos com figuras (fase 2) ----------
print("3. Turma e alunos")
s, turma = chamar("/turmas", "POST", {"nome": "3º ano Teste"}, prof)
confere("professora cria turma com código", s == 201 and len(turma.get("codigo", "")) == 5, turma.get("codigo", ""))
s, r = chamar(f"/turmas/{turma['id']}/alunos", "POST", {"nomes": ["Ana T.", "Bruno T.", "ana t."]}, prof)
confere("cadastra alunos (nome repetido é avisado)", s == 201 and len(r["criados"]) == 2 and r["repetidos"] == ["ana t."])
ana = next(a for a in r["criados"] if a["nome"] == "Ana T.")
s, r = chamar(f"/turmas/codigo/{turma['codigo'].lower()}/alunos")
confere("entrada do aluno: nomes pelo código (sem as figuras)", s == 200 and len(r["alunos"]) == 2 and "senha_figuras" not in r["alunos"][0])
erradas = [(figuras(ana)[0] + 1) % 9] + figuras(ana)[1:]
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": ana["id"], "figuras": erradas})
confere("figuras erradas são recusadas", s == 401)
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": ana["id"], "figuras": figuras(ana)})
aluna = r.get("token")
confere("aluna entra com as 3 figuras", s == 200 and bool(aluna))
s, r = chamar("/turmas", token=aluna)
confere("token de aluno NÃO abre rotas do professor", s == 401)

# ---------- 4. partidas, painel e ficha (fases 2 e 3) ----------
print("4. Partidas, painel e ficha")
HABS = {"fracoes": ["matematica", "percepcao", "logico"], "giro": ["espacial", "memoria", "lateralidade"]}
gravadas = 0
for i in range(10):
    jogo = random.choice(list(HABS))
    quando = agora - timedelta(days=35 - i * 3.5)
    acertos = min(10, 5 + i // 2)
    partida = {"id": str(uuid.uuid4()), "jogo": jogo, "titulo": jogo.title(), "acertos": acertos, "total": 10, "estrelas": 2,
               "jogada_em": quando.isoformat(), "habilidades": HABS[jogo],
               "detalhes": [{"tipo": "t", "titulo": "Conta", "certa": "6/10", "erros": ["somou os denominadores"] if acertos < 10 else [], "nivel": 1, "tempo": 5}],
               "resumo": [f"Acertou {acertos} de 10."]}
    s, r = chamar("/partidas", "POST", partida, aluna)
    gravadas += s == 201
confere("10 partidas gravadas (5 semanas)", gravadas == 10)
s, r = chamar("/partidas", "POST", partida, aluna)
confere("a mesma partida (fila sem internet) não duplica", s == 200 and r.get("repetida"))
s, r = chamar(f"/turmas/{turma['id']}/partidas", token=prof)
confere("professora vê as partidas da turma", s == 200 and len(r) == 10 and r[0]["aluno"]["nome"] == "Ana T.")
s, p = chamar(f"/turmas/{turma['id']}/painel?dias=90", token=prof)
confere("painel da turma", s == 200 and p["resumo"]["partidas"] == 10 and p["semJogar"] == ["Bruno T."], f"{p.get('resumo')}")
s, f = chamar(f"/alunos/{ana['id']}/ficha?dias=90", token=prof)
confere("ficha da aluna: 4+ semanas de evolução e habilidades", s == 200 and len(f["semanas"]) >= 4 and len(f["habilidades"]) >= 3,
        f"{len(f.get('semanas', []))} semanas")
confere("ficha: antes × depois e o que revisar", any(h["antes"] is not None and h["depois"] is not None for h in f["habilidades"]) and len(f["revisar"]) > 0)
for _ in range(5):
    chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": ana["id"], "figuras": erradas})
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": ana["id"], "figuras": figuras(ana)})
confere("5 erros seguidos travam a aluna por 1 minuto", s == 429)
s, r = chamar(f"/alunos/{ana['id']}", "PUT", {"novaSenha": True}, prof)
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": ana["id"], "figuras": figuras(r)})
confere("figuras novas destravam a aluna", s == 200)

# ---------- 5. questionário e competição no banco (fase 4) ----------
print("5. Questionário e competição")
s, r = chamar("/planilha", "POST", {"acao": "salvarQuestionario", "titulo": f"Quiz {sufixo}",
                                    "perguntas": [{"pergunta": "2 + 2?", "certa": "4", "erradas": ["3", "5"]}]}, prof)
confere("professora cria questionário", s == 200 and r.get("ok"))
s, r = chamar(f"/dados?acao=questionarios&escola={slug}")
quiz = next((q for q in r.get("lista", []) if q["titulo"] == f"Quiz {sufixo}"), None)
confere("questionário aparece na escola", bool(quiz))
s, r = chamar(f"/dados?acao=questionario&id={quiz['id'] if quiz else ''}&escola={slug}")
confere("abre o questionário com a pergunta", r.get("ok") and r["questionario"]["perguntas"][0]["certa"] == "4")
encerra = (agora + timedelta(hours=1)).isoformat()
s, r = chamar("/planilha", "POST", {"acao": "criarCompeticao", "nome": "Competição teste", "jogo": "fracoes",
                                    "jogoNome": "Pizzaria das Frações", "encerra": encerra}, prof)
comp = r.get("competicao", {})
confere("professora cria competição (código de 5 letras)", r.get("ok") and len(comp.get("codigo", "")) == 5, comp.get("codigo", ""))
s, r = chamar(f"/dados?acao=competicoes&escola={slug}")
confere("aparece para os alunos da escola, sem o código", any(x["id"] == comp["id"] and "codigo" not in x for x in r.get("lista", [])))
s, r = chamar("/dados?acao=competicoes")
confere("NÃO aparece na plataforma (outra escola)", not any(x["id"] == comp["id"] for x in r.get("lista", [])))
s, r = chamar("/dados", "POST", {"acao": "entrarCompeticao", "escola": slug, "id": comp["id"], "codigo": "ZZZZZ"})
confere("código errado é recusado", r.get("erro") == "codigo")
s, r = chamar("/dados", "POST", {"acao": "entrarCompeticao", "escola": slug, "id": comp["id"], "codigo": comp["codigo"]})
confere("aluno entra com o código", r.get("ok"))
for nome, pontos, acertos in [("Ana T.", 900, 8), ("Bruno T.", 700, 6), ("ana  t.", 1200, 10)]:
    s, r = chamar("/dados", "POST", {"acao": "resultadoCompeticao", "escola": slug, "id": comp["id"], "codigo": comp["codigo"],
                                     "nome": nome, "pontos": pontos, "acertos": acertos, "total": 10, "config": "Pizzaria"})
ranking = [(x["pontos"], x["partidas"]) for x in r.get("ranking", [])]
confere("ranking: melhor partida de cada aluno (mesmo nome = mesmo aluno)", ranking == [(1200, 2), (700, 1)], str(ranking))
chamar("/planilha", "POST", {"acao": "encerrarCompeticao", "id": comp["id"]}, prof)
s, r = chamar("/dados", "POST", {"acao": "entrarCompeticao", "escola": slug, "id": comp["id"], "codigo": comp["codigo"]})
confere("competição encerrada: ninguém mais entra", r.get("erro") == "encerrada")
s, r = chamar("/relatorios", "POST", {"escola": slug, "para": "nao.cadastrado@exemplo.test", "aluno": "Ana", "missao": "x"})
confere("relatório para e-mail fora da lista é recusado", r.get("erro") == "email")

# ---------- 6. testar grátis ----------
print("6. Testar grátis")
s, r = chamar("/testes", "POST", {"nome": "Visitante", "email": f"visitante.{sufixo}@exemplo.test", "perfil": "outro", "aceite": False})
confere("sem o aceite (LGPD) é recusado", s == 400)
s, r = chamar("/testes", "POST", {"nome": "Visitante Teste", "email": f"visitante.{sufixo}@exemplo.test", "perfil": "outro", "aceite": True, "escola": slug})
confere("cadastro do teste grátis", s == 201 and bool(r.get("token")))
s, r = chamar("/testes", token=adm)
confere("administrador vê o cadastro", s == 200 and any(t["email"] == f"visitante.{sufixo}@exemplo.test" for t in r))

# ---------- 7. teste grátis vencido: tudo bloqueado ----------
print("7. Bloqueio do teste grátis")
s, r = chamar(f"/escolas/{escola['id']}", "PUT", {"teste_ate": (agora - timedelta(days=1)).isoformat()}, adm)
confere("teste vencido bloqueia a escola", s == 200 and r.get("bloqueada"))
s, r = chamar("/sessions", "POST", {"email": email_prof, "senha": "professora2026"})
confere("professora não entra (escola bloqueada)", s == 403 and r.get("codigo") == "escola_bloqueada")
s, r = chamar(f"/turmas/codigo/{turma['codigo']}/alunos")
confere("alunos não entram (escola bloqueada)", s == 403)
s, r = chamar(f"/escolas/{escola['id']}", "PUT", {"plano": "ativo"}, adm)
confere("ativar o plano desbloqueia", s == 200 and not r.get("bloqueada"))

# ---------- 8. planilha do Google (carteiro dos e-mails) ----------
print("8. Script do Google (carteiro)")
try:
    versao = json.loads(urllib.request.urlopen(ENV["URL_PLANILHA"], timeout=60).read()).get("versao")
    confere("script da planilha na versão 6 (manda os relatórios pelo carteiro)", versao == 6, f"versão {versao}")
except Exception as e:
    confere("script da planilha responde", False, str(e))

# ---------- fim: a escola de teste fica desativada ----------
chamar(f"/turmas/{turma['id']}", "PUT", {"ativa": False}, prof)
chamar(f"/escolas/{escola['id']}", "PUT", {"ativa": False}, adm)
print(f"\nA escola de teste /{slug} ficou desativada.")
print("TUDO CERTO" if not falhas else f"FALHARAM {len(falhas)}: " + "; ".join(falhas))
sys.exit(1 if falhas else 0)
