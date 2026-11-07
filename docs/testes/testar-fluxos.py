"""
Teste automático dos fluxos do sistema com login e banco (fases 1 a 4, e a família), contra o sistema rodando no Docker.

Não depende de contas de teste: com o administrador do .env, cria uma escola nova (com nome aleatório), a coordenação,
um professor, uma turma e os alunos, e testa tudo dentro dessa escola (não mexe nos dados que já existem).
No fim, a escola de teste fica DESATIVADA (a API não apaga nada).

Como rodar (na pasta do projeto, com o sistema no ar: docker compose up -d):
    python docs/testes/testar-fluxos.py
    python docs/testes/testar-fluxos.py http://localhost:8090      (outro endereço)

Precisa só do Python 3 (sem pacotes extras). Lê ADMIN_EMAIL, ADMIN_SENHA, EMAIL_VIA e URL_PLANILHA do arquivo .env.
Com EMAIL_VIA=smtp, a parte 8 manda um relatório e confere se ele chegou na caixa de teste (mailpit, http://localhost:8025).
Termina com "TUDO CERTO" ou com a lista do que falhou (e código de saída 1).
"""

import base64
import json
import pathlib
import random
import sys
import time
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


def chamar(caminho, metodo="GET", corpo=None, token=None, extra=None):
    pedido = urllib.request.Request(
        API + caminho, method=metodo, data=json.dumps(corpo).encode() if corpo is not None else None,
        headers={**({"Content-Type": "application/json"} if corpo is not None else {}),
                 **({"Authorization": f"Bearer {token}"} if token else {}), **(extra or {})})
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

# ---------- 3. turma e alunos: só o código da turma e o nome, sem senha ----------
print("3. Turma e alunos")
s, turma = chamar("/turmas", "POST", {"nome": "3º ano Teste"}, prof)
confere("professora cria turma com código", s == 201 and len(turma.get("codigo", "")) == 5, turma.get("codigo", ""))
s, r = chamar(f"/turmas/{turma['id']}/alunos", "POST", {"nomes": ["Ana T.", "Bruno T.", "ana t."]}, prof)
confere("cadastra alunos (nome repetido é avisado)", s == 201 and len(r["criados"]) == 2 and r["repetidos"] == ["ana t."])
ana = next(a for a in r["criados"] if a["nome"] == "Ana T.")
s, r = chamar(f"/turmas/codigo/{turma['codigo'].lower()}/alunos")
confere("entrada do aluno: nomes pelo código", s == 200 and len(r["alunos"]) == 2)
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": ana["id"]})
aluna = r.get("token")
confere("aluna entra tocando no nome (sem senha)", s == 200 and bool(aluna))
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "nome": "ANA  T."})
confere("digitar o mesmo nome (outra caixa) é a mesma aluna", s == 200 and r["aluno"]["id"] == ana["id"])
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "nome": "Caio Novo"})
caio = r.get("token")
confere("nome novo entra na turma sozinho", s == 200 and bool(caio))
s, r = chamar("/sessions/aluno", "POST", {"codigo": "ZZZZZ", "nome": "Ana T."})
confere("código de turma errado é recusado", s == 404)
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
confere("painel da turma", s == 200 and p["resumo"]["partidas"] == 10 and sorted(p["semJogar"]) == ["Bruno T.", "Caio Novo"], f"{p.get('resumo')}")
s, f = chamar(f"/alunos/{ana['id']}/ficha?dias=90", token=prof)
confere("ficha da aluna: 4+ semanas de evolução e habilidades", s == 200 and len(f["semanas"]) >= 4 and len(f["habilidades"]) >= 3,
        f"{len(f.get('semanas', []))} semanas")
confere("ficha: antes × depois e o que revisar", any(h["antes"] is not None and h["depois"] is not None for h in f["habilidades"]) and len(f["revisar"]) > 0)

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
nova = {"acao": "criarCompeticao", "nome": "Competição teste", "jogo": "fracoes", "jogoNome": "Pizzaria das Frações", "encerra": encerra}
s, r = chamar("/planilha", "POST", nova, prof)
confere("competição sem turma é recusada", r.get("erro") == "turma")
s, r = chamar("/planilha", "POST", {**nova, "turma": turma["id"]}, prof)
comp = r.get("competicao", {})
confere("professora cria competição da turma", r.get("ok") and comp.get("turmaId") == turma["id"])
s, r = chamar("/planilha", "POST", {"acao": "competicoesProfessor"}, prof)
confere("na lista da professora, com o código da turma", any(x["id"] == comp["id"] and x["turmaCodigo"] == turma["codigo"] for x in r.get("lista", [])))
s, r = chamar(f"/dados?acao=competicoes&escola={slug}")
confere("NÃO aparece na lista pública (só com o código da turma)", not any(x["id"] == comp["id"] for x in r.get("lista", [])))
s, r = chamar("/sessions/aluno/competicoes", token=aluna)
daTurma = next((x for x in r.get("lista", []) if x["id"] == comp["id"]), {})
confere("aluna logada vê a competição da turma dela", bool(daTurma.get("codigo")))
for nome, pontos, acertos in [("Ana T.", 900, 8), ("Bruno T.", 700, 6), ("ana  t.", 1200, 10), ("Ana T.", 300, 3)]:
    s, r = chamar("/dados", "POST", {"acao": "resultadoCompeticao", "escola": slug, "id": comp["id"], "codigo": daTurma.get("codigo"),
                                     "nome": nome, "pontos": pontos, "acertos": acertos, "total": 10, "config": "Pizzaria"})
ranking = [(x["pontos"], x["partidas"]) for x in r.get("ranking", [])]
confere("ranking: vale a maior nota de cada aluno (mesmo nome = mesmo aluno)", ranking == [(1200, 3), (700, 1)], str(ranking))
chamar("/planilha", "POST", {"acao": "encerrarCompeticao", "id": comp["id"]}, prof)
s, r = chamar("/dados", "POST", {"acao": "entrarCompeticao", "escola": slug, "id": comp["id"], "codigo": daTurma.get("codigo")})
confere("competição encerrada: ninguém mais entra", r.get("erro") == "encerrada")

# administrador dentro da escola: faz tudo como a coordenação dela
s, r = chamar("/sessions/eu", token=adm, extra={"X-Escola": escola["id"]})
confere("administrador entra na escola (vira a coordenação dela)", s == 200 and r["usuario"]["perfil"] == "coordenacao" and r["usuario"]["adminNaEscola"])
s, r = chamar("/usuarios", "POST", {"nome": "Prof Pelo Admin", "email": f"prof2.{sufixo}@exemplo.test", "senha": "provisoria4", "perfil": "professor"},
              adm, extra={"X-Escola": escola["id"]})
confere("administrador cadastra professor na escola em que entrou", s == 201 and r.get("escola_id") == escola["id"])
s, r = chamar("/sessions/eu", token=adm)
confere("sem entrar na escola, continua administrador", r["usuario"]["perfil"] == "admin")
s, r = chamar("/usuarios", "POST", {"nome": "Prof Avulso", "email": f"avulso.{sufixo}@exemplo.test", "senha": "provisoria5", "perfil": "professor"}, adm)
avulso_id = r.get("id")
confere("administrador cadastra professor avulso (sem escola)", s == 201 and r.get("escola_id") is None)
chamar(f"/usuarios/{avulso_id}", "PUT", {"ativo": False}, adm)
s, r = chamar("/relatorios", "POST", {"escola": slug, "para": "nao.cadastrado@exemplo.test", "aluno": "Ana", "missao": "x"})
confere("relatório para e-mail fora da lista é recusado", r.get("erro") == "email")

# ---------- 5b. alunos da escola (com ou sem turma) e anamnese ----------
print("5b. Alunos e anamnese")
s, r = chamar("/alunos", "POST", {"nome": "Sem Turma T.", "nome_completo": "Aluno Sem Turma", "responsavel_nome": "Mãe Teste", "turmas": []}, coord)
sem_turma = r.get("id")
confere("coordenação cadastra aluno sem turma (só mapeado)", s == 201 and bool(sem_turma))
s, r = chamar("/alunos", "POST", {"nome": "Outro T.", "turmas": []}, prof)
confere("professor NÃO cadastra aluno sem uma turma dele", s == 400)
s, lista = chamar("/alunos", token=prof)
visto = next((a for a in lista if a["id"] == sem_turma), {}) if s == 200 else {}
confere("professor VÊ o aluno sem turma da escola, mas não mexe", bool(visto) and visto.get("pode_editar") is False)
s, _ = chamar(f"/alunos/{sem_turma}", "PUT", {"cadastro": {"observacoes": "x"}}, prof)
confere("professor NÃO edita aluno fora das turmas dele", s == 404)
# aluno em duas turmas: a professora cria outra turma e liga a Ana às duas
s, turma2 = chamar("/turmas", "POST", {"nome": "Reforço Teste"}, prof)
s, _ = chamar(f"/alunos/{ana['id']}", "PUT", {"turmas": [turma["id"], turma2["id"]]}, prof)
s, r = chamar(f"/alunos/{ana['id']}", token=prof)
confere("aluno em duas turmas", s == 200 and {x["id"] for x in r["aluno"]["turmas"]} == {turma["id"], turma2["id"]})
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma2["codigo"], "aluno_id": ana["id"]})
confere("o aluno entra pelo código de qualquer turma dele", s == 200)
# modelo de anamnese
perguntas = [{"tipo": "simnao", "texto": "Tem diagnóstico?", "obrigatoria": True},
             {"tipo": "multipla", "texto": "Como é o sono?", "opcoes": ["Bom", "Ruim"]},
             {"tipo": "escala", "texto": "Atenção (1 a 5)"}, {"tipo": "longa", "texto": "Observações"}]
s, modelo = chamar("/anamneses/modelos", "POST", {"titulo": f"Anamnese {sufixo}", "perguntas": perguntas}, prof)
confere("professor cria modelo de anamnese", s == 201 and len(modelo.get("perguntas", [])) == 4)
s, r = chamar("/anamneses/modelos", token=coord)
confere("coordenação vê o modelo do professor", any(m["id"] == modelo.get("id") for m in r))
s, r = chamar("/anamneses/modelos", "POST", {"titulo": "Ruim", "perguntas": [{"tipo": "multipla", "texto": "x", "opcoes": ["só uma"]}]}, prof)
confere("múltipla escolha com 1 opção é recusada", s == 400)
q = {p_["texto"]: p_["id"] for p_ in modelo["perguntas"]}
respostas = {q["Tem diagnóstico?"]: "nao", q["Como é o sono?"]: "Bom", q["Atenção (1 a 5)"]: 4}
s, r = chamar(f"/alunos/{ana['id']}/anamneses", "POST", {"modelo_id": modelo["id"], "respostas": respostas}, prof)
confere("sem a autorização do responsável, a anamnese é recusada (LGPD)", s == 400 and r.get("codigo") == "consentimento")
s, r = chamar(f"/alunos/{ana['id']}/anamneses", "POST", {"modelo_id": modelo["id"], "respostas": {q["Como é o sono?"]: "Bom"}, "consentimento": True}, prof)
confere("pergunta obrigatória sem resposta é recusada", s == 400)
s, r = chamar(f"/alunos/{ana['id']}/anamneses", "POST", {"modelo_id": modelo["id"], "respostas": respostas, "consentimento": True}, prof)
confere("professor aplica a anamnese (presencial) no aluno da turma dele", s == 201)
s, _ = chamar(f"/alunos/{sem_turma}/anamneses", "POST", {"modelo_id": modelo["id"], "respostas": respostas, "consentimento": True}, prof)
confere("professor NÃO aplica anamnese em aluno fora das turmas dele", s == 404)
# link para a família (3 horas, uma resposta)
s, link = chamar(f"/alunos/{sem_turma}/anamneses/link", "POST", {"modelo_id": modelo["id"]}, coord)
confere("coordenação gera o link para a família", s == 201 and len(link.get("token", "")) > 20)
s, r = chamar(f"/anamnese-publica/{link.get('token')}")
confere("a família abre o link (só o primeiro nome do aluno)", s == 200 and r.get("aluno") == "Aluno" and r.get("precisa_consentimento"))
s, r = chamar(f"/anamnese-publica/{link.get('token')}", "POST", {"respostas": respostas, "respondida_por_nome": "Mãe Teste"})
confere("sem a autorização marcada, a família não envia", s == 400)
s, r = chamar(f"/anamnese-publica/{link.get('token')}", "POST", {"respostas": respostas, "respondida_por_nome": "Mãe Teste", "consentimento": True})
confere("a família responde pelo link", s == 200)
s, r = chamar(f"/anamnese-publica/{link.get('token')}", "POST", {"respostas": respostas, "respondida_por_nome": "Mãe Teste", "consentimento": True})
confere("o link só aceita uma resposta", s == 410)
s, r = chamar("/anamnese-publica/" + "x" * 32)
confere("link inventado não abre", s == 410)
s, r = chamar(f"/alunos/{sem_turma}", token=prof)
confere("professor vê a anamnese do aluno sem turma (todas da escola)", s == 200 and any(a["status"] == "respondida" and a["respondida_por_nome"] == "Mãe Teste" for a in r["anamneses"]))
s, f = chamar(f"/alunos/{ana['id']}/ficha?dias=90", token=prof)
confere("a ficha do aluno traz a última anamnese", s == 200 and f.get("anamnese") and f["anamnese"]["titulo"] == f"Anamnese {sufixo}")
s, link2 = chamar(f"/alunos/{ana['id']}/anamneses/link", "POST", {"modelo_id": modelo["id"]}, prof)
chamar(f"/anamneses/{link2.get('id')}/cancelar", "PUT", {}, prof)
s, _ = chamar(f"/anamnese-publica/{link2.get('token')}")
confere("link cancelado não abre mais", s == 410)

# ---------- 5c. observações de evolução, perguntas de várias opções e o administrador cadastrando aluno ----------
print("5c. Observações, várias opções e aluno pelo administrador")
s, obs = chamar(f"/alunos/{ana['id']}/observacoes", "POST", {"categoria": "aprendizagem", "texto": "Leu o texto todo sozinha."}, prof)
confere("professor escreve observação no aluno da turma dele", s == 201 and obs.get("pode_editar"))
s, _ = chamar(f"/alunos/{sem_turma}/observacoes", "POST", {"texto": "x x x"}, prof)
confere("professor NÃO escreve observação em aluno fora das turmas dele", s == 404)
s, r = chamar(f"/alunos/{ana['id']}/observacoes", token=coord)
confere("coordenação vê a observação do professor", s == 200 and any(o["id"] == obs.get("id") for o in r))
s, _ = chamar(f"/observacoes/{obs.get('id')}", "PUT", {"texto": "Leu o texto todo sozinha, com fluência."}, coord)
confere("coordenação corrige a observação", s == 200)
s, _ = chamar(f"/alunos/{ana['id']}/observacoes", "POST", {"texto": "No futuro", "data": "2099-01-01"}, prof)
confere("observação com data no futuro é recusada", s == 400)
s, f = chamar(f"/alunos/{ana['id']}/ficha?dias=90", token=prof)
confere("a ficha traz as observações", s == 200 and any("fluência" in o["texto"] for o in f.get("observacoes", [])))
s, _ = chamar(f"/observacoes/{obs.get('id')}", "DELETE", None, prof)
confere("quem escreveu apaga a observação", s == 200)
varias = [{"tipo": "varias", "texto": "Tem dificuldade para", "opcoes": ["Ler", "Escrever", "Calcular"], "obrigatoria": True}]
s, mv = chamar("/anamneses/modelos", "POST", {"titulo": f"Várias {sufixo}", "perguntas": varias}, prof)
qid = mv.get("perguntas", [{}])[0].get("id")
s, _ = chamar(f"/alunos/{ana['id']}/anamneses", "POST", {"modelo_id": mv.get("id"), "respostas": {qid: ["Ler", "Inventada"]}}, prof)
s, r = chamar(f"/alunos/{ana['id']}", token=prof)
resp = next((a for a in r.get("anamneses", []) if a["titulo"] == f"Várias {sufixo}"), {}).get("respostas", {})
confere("várias opções: grava as marcadas (e ignora opção inventada)", resp.get(qid) == ["Ler"], str(resp))
s, r = chamar("/alunos", "POST", {"nome": "Pelo Admin T.", "turmas": []}, adm)
confere("administrador sem escolher a escola: pede a escola", s == 400)
s, r = chamar("/alunos", "POST", {"nome": "Pelo Admin T.", "turmas": [], "escola_id": escola["id"]}, adm)
confere("administrador cadastra aluno escolhendo a escola", s == 201)
s, r = chamar("/alunos", token=coord)
confere("o aluno do administrador aparece para a coordenação da escola", any(a["nome"] == "Pelo Admin T." for a in r))

# ---------- 5d. plano de objetivos psicopedagógicos ----------
print("5d. Plano de objetivos")
obj = {"area": "Leitura e escrita", "descricao": "Ler palavras com sílabas complexas", "jogos": ["ortografia", "inventado"],
       "indicador": "80% de acerto", "prazo": "8 semanas", "dias": ["seg", "qua", "xyz"]}
s, r = chamar(f"/alunos/{ana['id']}/planos", "POST", {"ciclo": "1º trimestre", "status": "ativo", "objetivos": []}, prof)
confere("plano ativo sem objetivo é recusado", s == 400)
s, p1 = chamar(f"/alunos/{ana['id']}/planos", "POST", {"ciclo": "1º trimestre", "status": "ativo", "objetivos": [obj],
                                                       "adequacoes_escola": ["Mais tempo nas avaliações"], "orientacoes_familia": "Ler 10 min por dia"}, prof)
confere("professor cria plano ativo no aluno da turma dele", s == 201 and p1["objetivos"][0]["dias"] == ["seg", "qua"], str(p1.get("objetivos")))
s, _ = chamar(f"/alunos/{sem_turma}/planos", "POST", {"ciclo": "x", "objetivos": [obj]}, prof)
confere("professor NÃO cria plano em aluno fora das turmas dele", s == 404)
s, p2 = chamar(f"/alunos/{ana['id']}/planos", "POST", {"ciclo": "2º trimestre", "status": "ativo", "objetivos": [obj]}, coord)
s, r = chamar(f"/alunos/{ana['id']}/planos", token=prof)
st = {x["ciclo"]: x["status"] for x in r.get("planos", [])}
confere("só um plano ativo: o anterior vira concluído", st.get("1º trimestre") == "concluido" and st.get("2º trimestre") == "ativo", str(st))
s, f = chamar(f"/alunos/{ana['id']}/ficha?dias=90", token=prof)
confere("a ficha traz o plano ativo", s == 200 and (f.get("plano") or {}).get("ciclo") == "2º trimestre")
s, r = chamar(f"/alunos/{sem_turma}/planos", token=prof)
confere("professor vê os planos de qualquer aluno da escola (só leitura)", s == 200 and r.get("pode_editar") is False)
s, _ = chamar(f"/planos/{p1.get('id')}", "DELETE", None, prof)
confere("quem criou apaga o plano", s == 200)

# ---------- 5e. plano de ação: habilidades-alvo e sessões com prontuário de bordo ----------
print("5e. Plano de ação e sessões")
obj2 = {"area": "Funções executivas", "descricao": "Manter a atenção por 10 minutos", "habilidades": ["sustentada", "memoria", "x!"],
        "jogos": ["reflexo", "dinos"]}
s, pa = chamar(f"/alunos/{ana['id']}/planos", "POST", {"ciclo": "Plano de ação", "status": "ativo", "objetivos": [obj2]}, prof)
confere("objetivo grava as habilidades-alvo (só as válidas)", s == 201 and pa["objetivos"][0]["habilidades"] == ["sustentada", "memoria"], str(pa.get("objetivos")))
oid = pa["objetivos"][0]["id"]
s, r = chamar(f"/planos/{pa['id']}/sessoes", "POST", {"gerar": 4, "inicio": "2026-11-02", "a_cada_dias": 7}, prof)
confere("gera o cronograma (4 sessões semanais)", s == 201 and [x["data"] for x in r] == ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"], str([x.get("data") for x in r] if isinstance(r, list) else r))
confere("as sessões geradas já vêm com os objetivos e os jogos do plano", r[0]["objetivos"] == [oid] and set(r[0]["jogos"]) == {"reflexo", "dinos"})
s1 = r[0]["id"]
s, x = chamar(f"/sessoes/{s1}", "PUT", {"status": "realizada", "regulacao": 4, "engajamento": 9, "anotacao": "Chegou agitado, regulou no meio.",
                                        "objetivos": [oid, "inexistente"]}, prof)
confere("registra o prontuário da sessão (nota fora de 1 a 5 é ignorada)", s == 200 and x["regulacao"] == 4 and x["engajamento"] is None and x["objetivos"] == [oid] and x["autor_nome"])
s, r = chamar(f"/planos/{pa['id']}/sessoes", "POST", {"atividades": "Jogo de cartas"}, prof)
confere("nova sessão avulsa entra no fim do cronograma", s == 201 and r["numero"] == 5)
s, r = chamar(f"/alunos/{ana['id']}/planos", token=prof)
pl = next((x for x in r.get("planos", []) if x["id"] == pa["id"]), {})
confere("a lista de planos mostra as sessões (1 de 5 realizadas)", pl.get("sessoes") == {"total": 5, "realizadas": 1}, str(pl.get("sessoes")))
s, r = chamar(f"/planos/{pa['id']}/sessoes", token=coord)
confere("coordenação vê o cronograma", s == 200 and len(r.get("sessoes", [])) == 5)
s, _ = chamar(f"/planos/{pa['id']}/sessoes", "POST", {"gerar": 99, "inicio": "2026-11-02"}, prof)
confere("gerar mais de 52 sessões é recusado", s == 400)

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

# ---------- 8. e-mail dos relatórios ----------
if ENV.get("EMAIL_VIA") == "smtp":
    # a API monta e envia o relatório (sem a planilha); confere na caixa de teste (mailpit) que ele chegou
    print("8. E-mail dos relatórios (SMTP, sem a planilha)")
    email_rel = f"relatorio.{sufixo}@exemplo.test"
    s, r = chamar("/planilha", "POST", {"acao": "adicionarEmail", "nome": "Professora Teste", "email": email_rel}, prof)
    confere("e-mail entra na lista da escola", any(x.get("email") == email_rel for x in r.get("emails", [])))
    relatorio = {"escola": slug, "para": email_rel, "tipo": "tabuada", "aluno": "Ana T.", "missao": "Tetris da Tabuada",
                 "data": "29/10/2026", "acertos": 7, "total": 10, "estrelas": 2,
                 "grupos": [{"titulo": "Tabuada do 8", "qtd": 2, "regra": "Lembrar os resultados da tabuada do 8."}],
                 "palavras": [{"certa": "7 × 8 = 56", "tentou": ["tocou no quadrado 54"]}],
                 "porRegra": [{"titulo": "Tabuada do 8", "total": 5, "erros": 2}],
                 "niveis": [{"n": 1, "ok": True}, {"n": 2, "ok": False}], "resumo": ["Estourou 10 quadrados."],
                 "tempos": [{"t": 2.5, "ok": True}, {"t": None, "ok": False}]}
    s, r = chamar("/relatorios", "POST", relatorio)
    confere("relatório enviado pela API (sem a planilha)", r.get("ok") is True, json.dumps(r))
    caixa = ENV.get("MAILPIT_URL", "http://localhost:8025").rstrip("/")
    try:
        msg = None
        for _ in range(10):
            j = json.loads(urllib.request.urlopen(f"{caixa}/api/v1/search?query=to:{email_rel}", timeout=10).read())
            if j.get("messages"):
                msg = j["messages"][0]
                break
            time.sleep(1)
        confere("o e-mail chegou na caixa de teste", bool(msg), msg.get("Subject", "") if msg else "nada em " + caixa)
        if msg:
            html = json.loads(urllib.request.urlopen(f"{caixa}/api/v1/message/{msg['ID']}", timeout=10).read()).get("HTML", "")
            confere("o e-mail tem o relatório (assunto do jogo, gráficos e o que revisar)",
                    "Cálculo mental" in html and "Tabuada do 8" in html and "7 × 8 = 56" in html)
    except Exception as e:
        print(f"  (a caixa de teste em {caixa} não respondeu: {e}; confira o e-mail no servidor SMTP)")
else:
    # o script do Google envia os relatórios (o "carteiro"): precisa estar na versão 6
    print("8. Script do Google (carteiro)")
    try:
        versao = json.loads(urllib.request.urlopen(ENV["URL_PLANILHA"], timeout=60).read()).get("versao")
        confere("script da planilha na versão 6 (manda os relatórios pelo carteiro)", versao == 6, f"versão {versao}")
    except Exception as e:
        confere("script da planilha responde", False, str(e))

# ---------- 9. o administrador desliga o e-mail do relatório dos jogos na escola ----------
print("9. Relatório por e-mail: ligar e desligar por escola (administrador)")
s, r = chamar(f"/escolas/{escola['id']}", "PUT", {"enviar_relatorios": False}, prof)
confere("professor não muda a configuração da escola", s in (401, 403, 404), f"status {s}")
s, r = chamar(f"/escolas/{escola['id']}", "PUT", {"enviar_relatorios": False}, adm)
confere("administrador desliga o e-mail do relatório", s == 200 and r.get("enviar_relatorios") is False, json.dumps(r)[:200])
s, r = chamar(f"/escolas/{slug}/marca")
confere("a marca da escola avisa o app que está desligado", r.get("enviar_relatorios") is False)
s, r = chamar("/relatorios", "POST", {"escola": slug, "para": "qualquer@exemplo.test", "aluno": "Ana", "missao": "x"})
confere("com o envio desligado, a API não manda o relatório", r.get("ok") is False and r.get("erro") == "desligado", json.dumps(r))
s, r = chamar(f"/escolas/{escola['id']}", "PUT", {"enviar_relatorios": True}, adm)
confere("administrador liga de novo", s == 200 and r.get("enviar_relatorios") is True)

# ---------- 10. a coordenação tira um e-mail da lista dos relatórios (o professor só acrescenta) ----------
print("10. Lista de e-mails: tirar alguém")
email_tirar = f"tirar.{sufixo}@exemplo.test"
s, r = chamar("/planilha", "POST", {"acao": "adicionarEmail", "nome": "Para Tirar", "email": email_tirar}, prof)
confere("professor acrescenta e-mail", r.get("ok") is True and any(x.get("email") == email_tirar for x in r.get("emails", [])))
s, r = chamar("/planilha", "POST", {"acao": "removerEmail", "email": email_tirar}, prof)
confere("professor não tira e-mail da lista", s == 403, f"status {s}")
s, r = chamar("/planilha", "POST", {"acao": "removerEmail", "email": email_tirar}, coord)
confere("coordenação tira o e-mail", r.get("ok") is True and not any(x.get("email") == email_tirar for x in r.get("emails", [])), json.dumps(r)[:200])
s, r = chamar("/planilha", "POST", {"acao": "removerEmail", "email": email_tirar}, coord)
confere("tirar de novo avisa que não está na lista", r.get("ok") is False)

# ---------- 11. guardar as partidas: configurável por escola (admin), turma e aluno (coordenação) ----------
print("11. Guardar as partidas: escola, turma e aluno")
def partida_nova():
    return {"id": str(uuid.uuid4()), "jogo": "giro", "titulo": "Giro", "acertos": 5, "total": 10, "estrelas": 1,
            "jogada_em": datetime.now(timezone.utc).isoformat(), "habilidades": ["espacial"]}
def qtd_partidas():
    return len(chamar(f"/turmas/{turma['id']}/partidas?limite=200", token=prof)[1])
antes = qtd_partidas()
s, r = chamar(f"/turmas/{turma['id']}", "PUT", {"salvar_partidas": False}, prof)
confere("professor não desliga a gravação da turma", s == 200 and r.get("salvar_partidas") is True, json.dumps(r)[:120])
for nivel, liga, desliga, quem in (
        ("escola", f"/escolas/{escola['id']}", f"/escolas/{escola['id']}", adm),
        ("turma", f"/turmas/{turma['id']}", f"/turmas/{turma['id']}", coord),
        ("aluno", f"/alunos/{ana['id']}", f"/alunos/{ana['id']}", coord)):
    s, r = chamar(desliga, "PUT", {"salvar_partidas": False}, quem)
    confere(f"desliga a gravação na {nivel}", s == 200)
    s, r = chamar("/partidas", "POST", partida_nova(), aluna)
    confere(f"com a {nivel} desligada, a partida não é guardada", s == 200 and r.get("guardada") is False and r.get("desligado") == nivel, json.dumps(r))
    chamar(liga, "PUT", {"salvar_partidas": True}, quem)
confere("nenhuma partida a mais enquanto estava desligado", qtd_partidas() == antes)
s, r = chamar("/partidas", "POST", partida_nova(), aluna)
confere("tudo ligado de novo: a partida é guardada", s == 201 and qtd_partidas() == antes + 1)
s, r = chamar("/turmas", token=prof)
confere("a turma informa se guarda as partidas", any(t.get("id") == turma["id"] and t.get("salvar_partidas") is True for t in r))

# ---------- 12. família: página de cadastro, responsável, recados e o que a família vê (docs/PLANO-FAMILIA.md) ----------
print("12. Família: página de cadastro, responsável e o que a família vê")
s, _ = chamar("/cadastro-familia/config", token=prof)
confere("professora da escola NÃO cuida da página de cadastro", s == 403)
s, r = chamar("/cadastro-familia/config", token=coord)
confere("a página de cadastro tem endereço fixo e começa fechada", s == 200 and r.get("aceita") is False and r.get("caminho") == f"/{slug}/cadastro", str(r))
pub = f"/cadastro-familia/publico/escola/{slug}"
s, r = chamar(pub)
confere("página fechada: avisa que o cadastro não está aberto", s == 200 and r.get("aberta") is False)
s, r = chamar(pub, "POST", {"consentimento": True, "nome": "X", "filhos": []})
confere("com a página fechada, ninguém se cadastra", s == 403 and r.get("codigo") == "cadastro_fechado")
s, r = chamar("/cadastro-familia/config", "PUT", {"aceita": True}, coord)
confere("coordenação abre o cadastro das famílias", s == 200 and r.get("aceita") is True)
s, r = chamar(pub)
confere("a página mostra a escola e está aberta", s == 200 and r.get("aberta") and r.get("tipo") == "escola" and r.get("escola", {}).get("nome") == f"Escola Teste {sufixo}", str(r)[:150])
pagina = urllib.request.urlopen(f"{SITE}/{slug}/cadastro").read().decode("utf-8")
confere("o endereço /<escola>/cadastro abre a página de cadastro", "Cadastro da família" in pagina and "cadastro-familia.js" in pagina)
s, _ = chamar("/cadastro-familia/publico/escola/escola-que-nao-existe")
confere("escola que não existe: página não encontrada", s == 404)
email_resp = f"mae.{sufixo}@exemplo.test"
def pin_(p):
    return {"pin": p, "pin_confirmacao": p}
filhos = [{"nome": "Lia F.", "nome_completo": "Lia Família", "data_nascimento": "2018-05-01", **pin_("2580")},
          {"nome": "Téo F.", **pin_("1397")}]
conta = {"nome": "Mãe Teste", "email": email_resp, "senha": "familia2026", "parentesco": "Mãe"}
s, r = chamar(pub, "POST", {**conta, "filhos": filhos})
confere("sem o consentimento (LGPD) o cadastro é recusado", s == 400 and r.get("codigo") == "consentimento")
s, r = chamar(pub, "POST", {**conta, "consentimento": True, "filhos": []})
confere("sem nenhum filho é recusado", s == 400)
s, r = chamar(pub, "POST", {**conta, "consentimento": True, "filhos": [{"nome": "X Y", "pin": "25a0", "pin_confirmacao": "25a0"}]})
confere("PIN que não tem 4 números é recusado", s == 400)
s, r = chamar(pub, "POST", {**conta, "consentimento": True, "filhos": [{"nome": "X Y", "pin": "2580", "pin_confirmacao": "2581"}]})
confere("os dois PINs diferentes são recusados", s == 400)
s, r = chamar(pub, "POST", {**conta, "consentimento": True, "filhos": [{"nome": "X Y", **pin_("1234")}]})
confere("PIN fácil demais (1234) é recusado", s == 400)
s, r = chamar(pub, "POST", {**conta, "senha": "123", "consentimento": True, "filhos": filhos})
confere("senha curta é recusada", s == 400)
s, r = chamar(pub, "POST", {**conta, "consentimento": True, "filhos": filhos}, prof)
confere("conta da equipe NÃO se cadastra como responsável", s == 400)
s, r = chamar(pub, "POST", {**conta, "consentimento": True, "filhos": filhos})
ids = [a["id"] for a in r.get("alunos", [])]
confere("o responsável preenche e já fica com os dois filhos (conta com perfil responsável)",
        s == 201 and r.get("usuario", {}).get("perfil") == "responsavel" and len(ids) == 2)
lia, teo = (ids + ["", ""])[:2]
s, r = chamar(pub, "POST", {**conta, "senha": "outrasenha1", "consentimento": True, "filhos": [{"nome": "Caçula M.", **pin_("4826")}]})
confere("e-mail que já tem conta com a senha errada é recusado", s == 409 and r.get("codigo") == "conta_existe")
s, r = chamar(pub, "POST", {**conta, "consentimento": True, "filhos": [{"nome": "Caçula M.", **pin_("4826")}]})
confere("mesmo e-mail e senha: o filho novo entra na conta que já existe", s == 201 and r.get("usuario", {}).get("email") == email_resp)
cacula = (r.get("alunos") or [{}])[0].get("id")
mae, r = entrar(email_resp, "familia2026")
confere("o responsável entra com e-mail e senha", bool(mae) and r["usuario"]["perfil"] == "responsavel")
s, r = chamar("/sessions/eu", token=mae)
confere("o responsável abre os dados da própria conta", s == 200)
s, r = chamar("/usuarios/eu/senha", "PUT", {"senhaAtual": "errada123", "novaSenha": "familia2027"}, mae)
confere("troca de senha do responsável: senha atual errada é recusada", s == 400 and r.get("message"))
s, r = chamar("/usuarios/eu/senha", "PUT", {"senhaAtual": "familia2026", "novaSenha": "curta"}, mae)
confere("troca de senha do responsável: senha nova curta é recusada", s == 400)
s, r = chamar("/usuarios/eu/senha", "PUT", {"senhaAtual": "familia2026", "novaSenha": "familia2027"}, mae)
confere("o responsável troca a própria senha", s == 200)
s, _ = chamar("/sessions", "POST", {"email": email_resp, "senha": "familia2026"})
confere("depois da troca, a senha antiga não entra mais", s == 401)
mae, _ = entrar(email_resp, "familia2027")
s, meus = chamar("/familia/filhos", token=mae)
confere("o responsável vê os três filhos (e só eles)", s == 200 and {f["id"] for f in meus} == {lia, teo, cacula}, str(meus)[:200])
confere("padrão da escola: jogos e recados ligados, plano e anamnese desligados",
        bool(meus) and all(f["relatorios"] == {"jogos": True, "recados": True, "plano": False, "anamnese": False} for f in meus))
s, lista = chamar("/alunos", token=coord)
novos = [a for a in lista if a["id"] in (lia, teo, cacula)] if s == 200 else []
confere("os filhos já são alunos da escola, sem turma, 'aguardando turma' e com a autorização registrada",
        len(novos) == 3 and all(a["aguardando_turma"] and not a["turmas"] and a["consentimento_em"] for a in novos), str(novos)[:200])
s, _ = chamar(f"/alunos/{lia}", "PUT", {"turmas": [turma["id"]]}, coord)
s, r = chamar(f"/alunos/{lia}", token=coord)
confere("a coordenação coloca a filha na turma: deixa de aguardar", s == 200 and not r["aluno"]["aguardando_turma"] and r["aluno"]["turmas"])
# a entrada do aluno cadastrado: código da turma → nome → PIN
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": lia})
confere("aluno cadastrado: tocar no nome pede o PIN", s == 401 and r.get("codigo") == "pin" and r.get("aluno", {}).get("nome") == "Lia F.")
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "nome": "lia f."})
confere("digitar o nome do aluno cadastrado também pede o PIN (não dá para pular)", s == 401 and r.get("codigo") == "pin")
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": lia, "pin": "0000"})
confere("PIN errado: avisa quantas tentativas restam", s == 401 and r.get("codigo") == "pin_errado" and r.get("restantes") == 4)
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": lia, "pin": "2580"})
lia_tk = r.get("token")
confere("PIN certo: a filha entra", s == 200 and bool(lia_tk))
gravou = sum(chamar("/partidas", "POST", partida_nova(), lia_tk)[0] == 201 for _ in range(2))
confere("a filha joga e as partidas ficam guardadas", gravou == 2)
s, r = chamar(f"/familia/filhos/{cacula}/pin", "PUT", {"pin": "1111", "pin_confirmacao": "1111"}, mae)
confere("trocar PIN: PIN fácil (1111) é recusado", s == 400 and r.get("message"))
s, r = chamar(f"/familia/filhos/{cacula}/pin", "PUT", {"pin": "2468", "pin_confirmacao": "2469"}, mae)
confere("trocar PIN: os dois PINs diferentes são recusados", s == 400)
s, r = chamar(f"/familia/filhos/{cacula}/pin", "PUT", {"pin": "24a8", "pin_confirmacao": "24a8"}, mae)
confere("trocar PIN: só números", s == 400)
s, r = chamar(f"/familia/filhos/{cacula}/pin", "PUT", {"pin": "2468", "pin_confirmacao": "2468"}, mae)
confere("o responsável troca o PIN do filho", s == 200)
s, r = chamar(f"/familia/filhos/{sem_turma}/pin", "PUT", {"pin": "2468", "pin_confirmacao": "2468"}, mae)
confere("o responsável NÃO troca o PIN de quem não é filho dele", s == 403)
s, _ = chamar(f"/familia/filhos/{cacula}/pin", "PUT", {"pin": "2468", "pin_confirmacao": "2468"}, coord)
confere("a coordenação não usa a rota de PIN da família (só o responsável)", s == 403)
chamar(f"/alunos/{cacula}", "PUT", {"turmas": [turma["id"]]}, coord)
for _ in range(5):
    s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": cacula, "pin": "9999"})
confere("5 PINs errados travam o aluno por alguns minutos", s == 423 and r.get("codigo") == "pin_bloqueado")
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": cacula, "pin": "2468"})
confere("travado, nem o PIN certo entra", s == 423)
chamar(f"/familia/filhos/{cacula}/pin", "PUT", {"pin": "2468", "pin_confirmacao": "2468"}, mae)
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": cacula, "pin": "2468"})
confere("o responsável troca o PIN e destrava: o filho entra com o PIN novo", s == 200 and bool(r.get("token")))
# a escola também redefine o PIN do filho e a senha do responsável (aba Família da página do aluno)
s, r = chamar(f"/alunos/{lia}/responsaveis", token=coord)
mae_id = (r.get("responsaveis") or [{}])[0].get("id")
confere("coordenação: pode dar senha provisória ao responsável e redefinir o PIN", s == 200 and r.get("pode_redefinir_senha") and r.get("pode_redefinir_pin"))
s, r = chamar(f"/alunos/{lia}/responsaveis", token=prof)
confere("professora da turma: redefine o PIN, mas não a senha do responsável", s == 200 and r.get("pode_redefinir_pin") and not r.get("pode_redefinir_senha"))
s, _ = chamar(f"/alunos/{lia}/pin", "PUT", {"pin": "3691", "pin_confirmacao": "3691"}, prof)
confere("a professora da turma redefine o PIN da aluna", s == 200)
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": lia, "pin": "3691"})
confere("a aluna entra com o PIN que a escola definiu", s == 200 and bool(r.get("token")))
s, _ = chamar(f"/alunos/{lia}/pin", "PUT", {"pin": "1234", "pin_confirmacao": "1234"}, coord)
confere("a escola também não pode pôr PIN fácil", s == 400)
s, _ = chamar(f"/alunos/{lia}/pin", "PUT", {"pin": "2580", "pin_confirmacao": "2580"}, coord)
confere("a coordenação redefine o PIN da aluna", s == 200)
s, r = chamar("/sessions/aluno", token=lia_tk)
confere("trocar o PIN pela escola derruba o login lembrado da aluna (token antigo)", s == 401 and r.get("codigo") == "sessao_trocada", str(r))
s, _ = chamar(f"/alunos/{teo}/pin", "PUT", {"pin": "3691", "pin_confirmacao": "3691"}, prof)
confere("professora NÃO redefine o PIN de aluno que não é das turmas dela", s == 403)
s, _ = chamar(f"/alunos/{lia}/pin", "PUT", {"pin": "3691", "pin_confirmacao": "3691"}, mae)
confere("o responsável não usa a rota da escola (troca pela área da família)", s == 403)
s, _ = chamar(f"/alunos/{lia}/responsaveis/{mae_id}/senha", "PUT", {"senha": "provisoria-fam1"}, prof)
confere("professora NÃO dá senha nova ao responsável", s == 403)
s, _ = chamar(f"/alunos/{lia}/responsaveis/{mae_id}/senha", "PUT", {"senha": "curta"}, coord)
confere("senha provisória curta é recusada", s == 400)
s, _ = chamar(f"/alunos/{sem_turma}/responsaveis/{mae_id}/senha", "PUT", {"senha": "provisoria-fam1"}, coord)
confere("só o responsável ligado àquele aluno (outro aluno = não encontrado)", s == 404)
s, _ = chamar(f"/alunos/{lia}/responsaveis/{mae_id}/senha", "PUT", {"senha": "provisoria-fam1"}, coord)
confere("a coordenação dá uma senha provisória ao responsável", s == 200)
s, _ = chamar("/sessions", "POST", {"email": email_resp, "senha": "familia2027"})
confere("a senha antiga do responsável deixa de valer", s == 401)
mae, r = entrar(email_resp, "provisoria-fam1")
confere("o responsável entra com a provisória e tem que criar a própria senha", bool(mae) and r["usuario"]["primeiro_login"] is True)
s, _ = chamar("/usuarios/eu/senha", "PUT", {"senhaAtual": "provisoria-fam1", "novaSenha": "familia2027"}, mae)
mae, r = entrar(email_resp, "familia2027")
confere("o responsável cria a senha dele e entra normalmente", s == 200 and bool(mae) and r["usuario"]["primeiro_login"] is False)
s, r = chamar(f"/familia/filhos/{lia}", token=mae)
confere("a ficha da filha tem o consentimento do responsável e nada interno", s == 200 and bool(r.get("consentimento_em")) and "observacoes" not in r, str(r)[:200])
s, r = chamar(f"/familia/filhos/{lia}", "PUT", {"nome_completo": "Lia Família da Silva", "data_nascimento": "2018-05-02"}, mae)
confere("o responsável corrige os dados cadastrais da filha", s == 200 and r.get("nome_completo") == "Lia Família da Silva")
s, r = chamar(f"/familia/filhos/{lia}/jogos?dias=90", token=mae)
confere("o responsável vê os jogos e o desempenho (partidas da escola)", s == 200 and len(r.get("ultimas", [])) == 2 and r["ultimas"][0].get("local") == "escola")
# ---------- 12b. jogar em casa: "Quem vai jogar?" pela conta do responsável → PIN (fase 4) ----------
def prazo_do_token(tk):
    corpo = tk.split(".")[1]
    dados = json.loads(base64.urlsafe_b64decode(corpo + "=" * (-len(corpo) % 4)))
    return dados["exp"] - dados["iat"]
s, meus = chamar("/familia/filhos", token=mae)
confere("Quem vai jogar?: a lista dos filhos diz quem já tem PIN", s == 200 and all(f.get("tem_pin") is True for f in meus))
s, r = chamar(f"/familia/filhos/{lia}/entrar", "POST", {}, mae)
confere("em casa: sem o PIN, pede o PIN", s == 401 and r.get("codigo") == "pin")
s, r = chamar(f"/familia/filhos/{lia}/entrar", "POST", {"pin": "0000"}, mae)
confere("em casa: PIN errado avisa quantas tentativas restam", s == 401 and r.get("codigo") == "pin_errado" and r.get("restantes") == 4)
s, _ = chamar(f"/familia/filhos/{sem_turma}/entrar", "POST", {"pin": "2580"}, mae)
confere("em casa: o responsável NÃO abre a entrada de quem não é filho dele", s == 403)
s, _ = chamar(f"/familia/filhos/{lia}/entrar", "POST", {"pin": "2580"}, coord)
confere("em casa: só a conta do responsável abre a entrada (coordenação = 403)", s == 403)
s, r = chamar(f"/familia/filhos/{lia}/entrar", "POST", {"pin": "2580"}, mae)
casa_tk = r.get("token") or ""
confere("em casa: PIN certo, a filha entra sem código de turma", s == 200 and bool(casa_tk) and r.get("aluno", {}).get("local") == "casa"
        and r["aluno"].get("cadastrado") is True)
confere("em casa o login vale 30 dias (o app lembra)", bool(casa_tk) and prazo_do_token(casa_tk) == 30 * 86400)
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "aluno_id": lia, "pin": "2580"})
confere("pela turma o login vale 12 horas (o app lembra só até o fim do dia)", s == 200 and prazo_do_token(r["token"]) == 12 * 3600
        and r["aluno"].get("local") == "escola" and r["aluno"].get("cadastrado") is True)
s, r = chamar("/sessions/aluno", token=casa_tk)
confere("o login de casa abre o app (Continuar como...)", s == 200 and r.get("aluno", {}).get("local") == "casa")
p_casa = {**partida_nova(), "local": "escola"}
s, _ = chamar("/partidas", "POST", p_casa, casa_tk)
s2, r = chamar(f"/familia/filhos/{lia}/jogos?dias=90", token=mae)
confere("a partida de casa fica guardada com local = casa (vem do token, não do aparelho)",
        s == 201 and len(r.get("ultimas", [])) == 3 and any(u["id"] == p_casa["id"] and u["local"] == "casa" for u in r.get("ultimas", [])))
s, r = chamar(f"/turmas/{turma['id']}/partidas?limite=200", token=prof)
confere("a professora vê a partida de casa como as outras", s == 200 and any(x["id"] == p_casa["id"] for x in r))
s, r = chamar("/sessions/aluno/competicoes", token=casa_tk)
confere("em casa, com turma: as competições da turma continuam abrindo", s == 200 and isinstance(r.get("lista"), list))
# filho sem turma (aguardando turma) joga em casa
s, r = chamar(f"/familia/filhos/{teo}/entrar", "POST", {"pin": "1397"}, mae)
teo_tk = r.get("token") or ""
confere("em casa: o filho que ainda não tem turma também entra", s == 200 and bool(teo_tk) and r["aluno"].get("turma") is None)
p_teo = partida_nova()
s, _ = chamar("/partidas", "POST", p_teo, teo_tk)
s2, r = chamar(f"/familia/filhos/{teo}/jogos?dias=90", token=mae)
confere("a partida de casa do filho sem turma fica guardada", s == 201 and [u["id"] for u in r.get("ultimas", [])] == [p_teo["id"]])
s, r = chamar(f"/alunos/{teo}/ficha?dias=90", token=coord)
confere("a coordenação vê a partida de casa na ficha do aluno sem turma", s == 200 and r.get("resumo", {}).get("partidas") == 1, str(r)[:200])
s, r = chamar("/sessions/aluno/competicoes", token=teo_tk)
confere("em casa sem turma: nenhuma competição (e sem erro)", s == 200 and r.get("lista") == [])
# trocar o PIN derruba os logins lembrados; o bloqueio por tentativas vale também em casa
s, _ = chamar(f"/familia/filhos/{teo}/pin", "PUT", {"pin": "3517", "pin_confirmacao": "3517"}, mae)
s2, r = chamar("/sessions/aluno", token=teo_tk)
confere("trocar o PIN pela família derruba o login lembrado do filho", s == 200 and s2 == 401 and r.get("codigo") == "sessao_trocada")
s, _ = chamar("/partidas", "POST", partida_nova(), teo_tk)
confere("com o token antigo, nem partida grava", s == 401)
s, r = chamar(f"/familia/filhos/{teo}/entrar", "POST", {"pin": "3517"}, mae)
confere("com o PIN novo o filho entra de novo", s == 200 and bool(r.get("token")))
for _ in range(5):
    s, r = chamar(f"/familia/filhos/{teo}/entrar", "POST", {"pin": "9999"}, mae)
confere("em casa: 5 PINs errados travam alguns minutos", s == 423 and r.get("codigo") == "pin_bloqueado")
s, _ = chamar(f"/familia/filhos/{teo}/entrar", "POST", {"pin": "3517"}, mae)
confere("travado em casa, nem o PIN certo entra", s == 423)
chamar(f"/familia/filhos/{teo}/pin", "PUT", {"pin": "1397", "pin_confirmacao": "1397"}, mae)
s, _ = chamar(f"/familia/filhos/{teo}/entrar", "POST", {"pin": "1397"}, mae)
confere("trocar o PIN destrava a entrada em casa", s == 200)
s, r = chamar("/sessions/aluno", token=casa_tk)
confere("o login de casa da irmã não cai quando muda o PIN do irmão", s == 200)
# código da família: o filho joga no aparelho dele, sem a conta do responsável
s, r = chamar("/familia/codigo", token=mae)
cod_fam = r.get("codigo", "")
confere("o responsável tem um código da família (FAM-XXXXX)", s == 200 and len(cod_fam) == 9 and cod_fam.startswith("FAM-"), str(r))
s, r = chamar("/familia/codigo", token=mae)
confere("o código da família é sempre o mesmo até gerar outro", s == 200 and r.get("codigo") == cod_fam)
s, _ = chamar("/familia/codigo", token=coord)
confere("a equipe não tem código da família (só o responsável)", s == 403)
s, r = chamar(f"/alunos/{lia}/responsaveis", token=coord)
confere("a ficha do aluno não mostra o código da família para a equipe", s == 200 and "codigo_familia" not in json.dumps(r))
s, r = chamar(f"/familia-codigo/{cod_fam}")
filhos_cod = r.get("filhos", [])
confere("pelo código, o aparelho vê os filhos que jogam (só id e apelido)",
        s == 200 and {f["id"] for f in filhos_cod} == {lia, teo, cacula} and all(set(f) == {"id", "nome"} for f in filhos_cod), str(r)[:200])
s, r = chamar(f"/familia-codigo/{cod_fam[4:].lower()}")
confere("o código vale sem o FAM- e em minúsculas", s == 200 and len(r.get("filhos", [])) == 3)
s, _ = chamar("/familia-codigo/FAM-ZZZZZ")
confere("código da família que não existe = 404", s == 404)
s, _ = chamar(f"/familia-codigo/{cod_fam}/entrar", "POST", {"aluno_id": sem_turma, "pin": "2580"})
confere("pelo código, aluno de outra família não entra", s == 404)
s, r = chamar(f"/familia-codigo/{cod_fam}/entrar", "POST", {"aluno_id": lia, "pin": "0000"})
confere("pelo código: PIN errado avisa quantas tentativas restam", s == 401 and r.get("codigo") == "pin_errado")
s, r = chamar(f"/familia-codigo/{cod_fam}/entrar", "POST", {"aluno_id": lia, "pin": "2580"})
cod_tk = r.get("token") or ""
confere("pelo código: PIN certo, a filha entra no aparelho dela (30 dias, local casa)",
        s == 200 and r.get("aluno", {}).get("local") == "casa" and bool(cod_tk) and prazo_do_token(cod_tk) == 30 * 86400)
p_cod = partida_nova()
s, _ = chamar("/partidas", "POST", p_cod, cod_tk)
s2, r = chamar(f"/familia/filhos/{lia}/jogos?dias=90", token=mae)
confere("a partida feita pelo código da família fica com local = casa",
        s == 201 and any(u["id"] == p_cod["id"] and u["local"] == "casa" for u in r.get("ultimas", [])))
s, r = chamar("/familia/codigo/novo", "POST", {}, mae)
cod_novo = r.get("codigo", "")
confere("o responsável gera outro código da família", s == 200 and cod_novo.startswith("FAM-") and cod_novo != cod_fam)
s, _ = chamar(f"/familia-codigo/{cod_fam}")
confere("o código antigo deixa de valer", s == 404)
s, r = chamar("/sessions/aluno", token=cod_tk)
confere("o aparelho que entrou com o código antigo cai (pede o código novo)", s == 401 and r.get("codigo") == "familia_trocada")
s, r = chamar(f"/familia-codigo/{cod_novo}/entrar", "POST", {"aluno_id": lia, "pin": "2580"})
confere("com o código novo a filha entra de novo", s == 200 and bool(r.get("token")))
s, _ = chamar("/sessions/aluno", token=casa_tk)
confere("o login feito pela conta do responsável não cai com o código novo", s == 200)
# o que a família NUNCA vê: outro aluno, observações internas, as rotas da equipe
s, obs_lia = chamar(f"/alunos/{lia}/observacoes", "POST", {"categoria": "familia", "texto": "Anotação interna da equipe."}, prof)
confere("professora escreve observação interna na aluna da turma dela", s == 201)
s, _ = chamar(f"/familia/filhos/{sem_turma}", token=mae)
confere("o responsável NÃO vê aluno que não é filho dele", s == 403)
s, _ = chamar(f"/familia/filhos/{sem_turma}/jogos", token=mae)
confere("nem os jogos de outro aluno", s == 403)
s, r = chamar(f"/alunos/{lia}/observacoes", token=mae)
confere("o responsável NÃO vê as observações internas (nem da filha)", s == 403 and r.get("codigo") == "area_da_familia")
for rota in ("/alunos", f"/alunos/{lia}", f"/alunos/{lia}/ficha", "/turmas", f"/alunos/{lia}/planos"):
    s, _ = chamar(rota, token=mae)
    confere(f"o responsável NÃO abre a rota da equipe {rota.replace(lia, ':id')}", s == 403)
# recados para a família
s, rec = chamar(f"/alunos/{lia}/recados", "POST", {"texto": "Amanhã tem passeio, mandar boné."}, prof)
confere("professora escreve recado para a família", s == 201 and rec.get("pode_editar"))
s, _ = chamar(f"/alunos/{sem_turma}/recados", "POST", {"texto": "x x x"}, prof)
confere("professora NÃO escreve recado para aluno fora das turmas dela", s == 404)
s, r = chamar(f"/familia/filhos/{lia}/recados", token=mae)
confere("o responsável vê o recado (e não a observação interna)", s == 200 and [x["texto"] for x in r] == ["Amanhã tem passeio, mandar boné."])
s, _ = chamar(f"/recados/{rec['id']}", "PUT", {"texto": "Amanhã tem passeio: mandar boné e água."}, coord)
confere("coordenação corrige o recado", s == 200)
s, rec2 = chamar(f"/alunos/{lia}/recados", "POST", {"texto": "Recado para apagar."}, coord)
s, _ = chamar(f"/recados/{rec2.get('id')}", "DELETE", None, prof)
confere("professora NÃO apaga o recado da coordenação", s == 404)
s, _ = chamar(f"/recados/{rec2.get('id')}", "DELETE", None, coord)
confere("quem escreveu apaga o recado", s == 200)
# o que a família vê: as chaves da escola
chamar(f"/alunos/{lia}/planos", "POST", {"ciclo": "Família", "status": "ativo", "objetivos": [obj], "adequacoes_escola": ["Mais tempo"]}, prof)
s, r = chamar(f"/familia/filhos/{lia}/planos", token=mae)
confere("plano desligado na escola: a família não recebe o plano", s == 200 and r == [])
s, _ = chamar(f"/alunos/{lia}/anamneses", "POST", {"modelo_id": modelo["id"], "respostas": respostas}, prof)
s, r = chamar(f"/familia/filhos/{lia}/anamneses", token=mae)
confere("anamnese da equipe desligada: a família não recebe", s == 200 and r == [])
s, _ = chamar("/visivel-familia", "PUT", {"plano": True}, prof)
confere("professora da escola NÃO muda o que a família vê", s == 403)
s, r = chamar("/visivel-familia", "PUT", {"plano": True, "inventado": True}, coord)
confere("coordenação liga o plano para a família", s == 200 and r["chaves"] == {"jogos": True, "recados": True, "plano": True, "anamnese": False}, str(r))
s, r = chamar(f"/familia/filhos/{lia}/planos", token=mae)
confere("plano ligado: a família vê o plano (sem as adequações da escola)", s == 200 and len(r) == 1 and "adequacoes_escola" not in r[0], str(r)[:200])
chamar("/visivel-familia", "PUT", {"recados": False}, coord)
s, r = chamar(f"/familia/filhos/{lia}/recados", token=mae)
confere("recados desligados na escola: somem para a família", s == 200 and r == [])
chamar("/visivel-familia", "PUT", {"recados": True}, coord)
# exceção por aluno (na ficha)
s, _ = chamar(f"/alunos/{lia}/visivel-familia", "PUT", {"anamnese": True}, prof)
confere("professora da escola NÃO muda a exceção do aluno", s == 403)
s, r = chamar(f"/alunos/{lia}/visivel-familia", "PUT", {"anamnese": True, "jogos": False}, coord)
confere("coordenação liga a anamnese e desliga os jogos só para esta aluna", s == 200 and r["excecao"] == {"anamnese": True, "jogos": False}, str(r))
s, r = chamar(f"/familia/filhos/{lia}/anamneses", token=mae)
confere("exceção: a família vê a anamnese da equipe desta aluna", s == 200 and len(r) == 1 and r[0]["da_familia"] is False)
s, r = chamar(f"/familia/filhos/{lia}/jogos", token=mae)
confere("exceção: jogos desligados para esta aluna", s == 403 and r.get("codigo") == "desligado")
s, r = chamar(f"/alunos/{lia}/visivel-familia", "PUT", {"jogos": None}, coord)
confere("tirar a exceção (null) volta a seguir a escola", s == 200 and r["excecao"] == {"anamnese": True} and r["efetivo"]["jogos"] is True, str(r))
s, r = chamar(f"/alunos/{lia}/visivel-familia", token=prof)
confere("a ficha mostra a regra da escola ao lado da exceção (professora só lê)",
        s == 200 and r["regra"]["anamnese"] is False and r["efetivo"]["anamnese"] is True and r["pode_mudar"] is False, str(r))
s, r = chamar(f"/familia/filhos/{teo}/anamneses", token=mae)
confere("a exceção vale só para a aluna dela (o irmão segue a escola)", s == 200 and r == [])
# os responsáveis do aluno
s, r = chamar(f"/alunos/{teo}/responsaveis", token=coord)
confere("a ficha mostra o responsável que se cadastrou", s == 200 and [x["email"] for x in r.get("responsaveis", [])] == [email_resp] and r.get("pode_desvincular"))
mae_id = (r.get("responsaveis") or [{}])[0].get("id")
s, _ = chamar(f"/alunos/{teo}/responsaveis/{mae_id}", "DELETE", None, prof)
confere("professora NÃO tira o responsável do aluno", s in (403, 404))
s, _ = chamar(f"/alunos/{teo}/responsaveis/{mae_id}", "DELETE", None, coord)
s, r = chamar("/familia/filhos", token=mae)
confere("coordenação tira o responsável de um filho: ele perde só aquele acesso", s == 200 and {f["id"] for f in r} == {lia, cacula})
s, _ = chamar(f"/familia/filhos/{teo}/recados", token=mae)
confere("o responsável desligado não abre mais aquele filho", s == 403)
s, _ = chamar("/cadastro-familia/config", "PUT", {"aceita": False}, coord)
s, r = chamar(pub, "POST", {**conta, "senha": "familia2027", "consentimento": True, "filhos": [{"nome": "Mais Um", **pin_("4826")}]})
confere("coordenação fecha o cadastro: a página para de aceitar", s == 403 and r.get("codigo") == "cadastro_fechado")
# professor avulso (psicopedagoga): página /cadastro/<apelido>; os filhos viram pacientes dele, sem turma
email_avulso = f"psico.{sufixo}@exemplo.test"
s, _ = chamar("/usuarios", "POST", {"nome": f"Psico {sufixo}", "email": email_avulso, "senha": "provisoria4", "perfil": "professor"}, adm)
psico, _ = entrar(email_avulso, "provisoria4")
s, r = chamar("/cadastro-familia/config", token=psico)
confere("o professor avulso ganha o endereço dele a partir do nome", s == 200 and r.get("caminho") == f"/cadastro/psico-{sufixo}" and r.get("aceita") is False, str(r))
chamar("/cadastro-familia/config", "PUT", {"aceita": True}, psico)
pub_p = f"/cadastro-familia/publico/profissional/psico-{sufixo}"
s, r = chamar(pub_p)
confere("a página mostra o nome do profissional", s == 200 and r.get("tipo") == "profissional" and r.get("profissional") == f"Psico {sufixo}" and r.get("aberta"))
pagina = urllib.request.urlopen(f"{SITE}/cadastro/psico-{sufixo}").read().decode("utf-8")
confere("o endereço /cadastro/<apelido> abre a página de cadastro", "Cadastro da família" in pagina)
s, r = chamar(pub_p, "POST", {"nome": "Pai Paciente", "email": f"paipac.{sufixo}@exemplo.test", "senha": "familia2026",
                             "consentimento": True, "filhos": [{"nome": "Davi P.", **pin_("7193")}]})
pac = (r.get("alunos") or [{}])[0].get("id")
pai_pac = r.get("token")
confere("a família se cadastra na página do professor avulso", s == 201 and bool(pac))
s, lista = chamar("/alunos", token=psico)
visto = next((a for a in lista if a["id"] == pac), {}) if s == 200 else {}
confere("o paciente aparece para o professor avulso (sem turma, ele edita, não 'aguarda turma')",
        bool(visto) and visto.get("pode_editar") is True and not visto.get("turmas") and not visto.get("aguardando_turma"))
s, _ = chamar(f"/alunos/{pac}/recados", "POST", {"texto": "Bem-vindos ao acompanhamento."}, psico)
confere("o professor avulso escreve recado para a família do paciente", s == 201)
s, _ = chamar(f"/alunos/{pac}", token=prof)
confere("professora da escola NÃO vê o paciente do avulso", s == 404)
chamar(f"/alunos/{pac}/planos", "POST", {"ciclo": "Atendimento", "status": "ativo", "objetivos": [obj]}, psico)
s, r = chamar(f"/familia/filhos/{pac}/planos", token=pai_pac)
confere("paciente do avulso: plano desligado por padrão (a chave da escola não vale aqui)", s == 200 and r == [])
s, r = chamar("/visivel-familia", "PUT", {"plano": True}, psico)
confere("o professor avulso tem as próprias chaves", s == 200 and r["chaves"]["plano"] is True)
s, r = chamar(f"/familia/filhos/{pac}/planos", token=pai_pac)
confere("o professor avulso liga o plano: a família vê", s == 200 and len(r) == 1)
s, r = chamar(pub_p, "POST", {"nome": "Mãe Teste", "email": email_resp, "senha": "familia2027", "consentimento": True,
                             "filhos": [{"nome": "Lia F.", **pin_("2580")}]})
s, r = chamar("/familia/filhos", token=mae)
confere("o mesmo responsável também fica ligado à psicopedagoga (filhos da escola e do atendimento)", s == 200 and len(r) == 3)
s, _ = chamar(f"/alunos/{pac}/observacoes", token=pai_pac)
confere("o responsável NÃO vê observações do paciente", s == 403)
s, _ = chamar(f"/alunos/{pac}/pin", "PUT", {"pin": "3691", "pin_confirmacao": "3691"}, psico)
confere("a psicopedagoga redefine o PIN do paciente dela", s == 200)
s, _ = chamar(f"/alunos/{lia}/pin", "PUT", {"pin": "3691", "pin_confirmacao": "3691"}, psico)
confere("a psicopedagoga NÃO redefine o PIN de aluno da escola", s == 403)
s, r = chamar(f"/alunos/{pac}/responsaveis", token=psico)
pai_id = next((x["id"] for x in r.get("responsaveis", []) if x["email"] == f"paipac.{sufixo}@exemplo.test"), None)
s, _ = chamar(f"/alunos/{pac}/responsaveis/{pai_id}/senha", "PUT", {"senha": "provisoria-pac1"}, psico)
confere("a psicopedagoga dá uma senha provisória ao responsável do paciente", s == 200 and bool(entrar(f"paipac.{sufixo}@exemplo.test", "provisoria-pac1")[0]))
s, _ = chamar(f"/alunos/{pac}/responsaveis/{pai_id}/senha", "PUT", {"senha": "provisoria-pac2"}, coord)
confere("a coordenação da escola NÃO mexe no responsável do paciente da psicopedagoga", s in (403, 404))
chamar("/cadastro-familia/config", "PUT", {"aceita": False}, psico)
# o aluno avulso (código da turma + nome) continua igual
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "nome": "Aluno Novo Familia"})
confere("o aluno avulso continua entrando com o código da turma e o nome (sem PIN: o app não lembra o login)", s == 200 and bool(r.get("token"))
        and r["aluno"].get("cadastrado") is False)

# ---------- 13. questões por IA: fotos/PDF do exercício → perguntas no formato da planilha (sem guardar o arquivo) ----------
# O teste nunca chama o Gemini/Groq de verdade: com IA_FALSA=1 no .env a API devolve perguntas fixas (passando pela
# mesma validação). Sem o modo falso, só as partes que não chegam à IA são testadas.
print("13. Questões por IA")
PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
PDF = base64.b64encode(b"%PDF-1.4 1 0 obj<<>>endobj trailer<<>> %%EOF").decode()
s, st = chamar("/questionarios/ia", token=prof)
confere("a professora vê se a IA está configurada e quantas gerações restam hoje", s == 200 and "restantes" in st and "limite" in st, str(st))
s, _ = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG]}, mae)
confere("o responsável NÃO gera questões por IA", s == 403)
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "nome": "Aluno IA"})
s, _ = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG]}, r.get("token"))
confere("o aluno NÃO gera questões por IA", s in (401, 403), s)
s, _ = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG]}, adm)
confere("o administrador fora de uma escola NÃO gera (só de dentro da escola)", s == 403)
s, r = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [base64.b64encode(b"isto nao e imagem nem pdf").decode()]}, prof)
confere("arquivo que não é foto nem PDF é recusado", s == 400 and r.get("codigo") == "arquivo_invalido", r.get("message", ""))
s, r = chamar("/questionarios/gerar-ia", "POST", {"arquivos": []}, prof)
confere("sem arquivo é recusado", s == 400)
s, r = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG], "quantidade": 7}, prof)
confere("quantidade fora de 5, 10 ou 15 é recusada", s == 400)
s, r = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG] * 7}, prof)
confere("mais de 6 arquivos é recusado", s == 400)
if not st.get("falsa"):
    print("  AVISO  IA_FALSA não está ligada no .env: a geração em si e o limite diário não foram testados")
else:
    s, r = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG], "materia": "Matemática", "tema": "Somas"}, prof)
    qs = r.get("perguntas") or []
    formato = all(isinstance(q.get("pergunta"), str) and q["pergunta"] and isinstance(q.get("certa"), str) and q["certa"]
                  and isinstance(q.get("erradas"), list) and 1 <= len(q["erradas"]) <= 3 and q["certa"] not in q["erradas"] for q in qs)
    confere("a foto vira 10 perguntas (padrão) no formato da planilha", s == 200 and len(qs) == 10 and formato, f"{len(qs)} perguntas")
    confere("a validação descarta pergunta repetida e incompleta e tira a errada igual à certa",
            len({q["pergunta"] for q in qs}) == len(qs) and not any(q["pergunta"] == "Incompleta?" for q in qs))
    s, r = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PDF, PNG], "quantidade": 5, "dificuldade": "dificil"}, prof)
    confere("PDF + foto com 5 perguntas", s == 200 and len(r.get("perguntas") or []) == 5)
    s, r = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG], "dificuldade": "impossivel"}, prof)
    confere("dificuldade inválida é recusada", s == 400)
    s, st2 = chamar("/questionarios/ia", token=prof)
    usadas = st2.get("usadasHoje", 0)
    confere("cada geração conta no limite do dia", usadas == 2 and st2.get("restantes") == st2.get("limite", 0) - 2, str(st2))
    for _ in range(max(0, st2.get("restantes", 0))):
        chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG], "quantidade": 5}, prof)
    s, r = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG]}, prof)
    confere("passou do limite diário: recusa com mensagem clara", s == 429 and r.get("codigo") == "limite_diario", r.get("message", ""))
    s, r = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG]}, coord)
    confere("o limite é por pessoa: a coordenação ainda gera", s == 200)
    s, _ = chamar("/questionarios/gerar-ia", "POST", {"arquivos": [PNG]}, adm, extra={"X-Escola": escola["id"]})
    confere("o administrador dentro da escola gera", s == 200)

# o questionário da IA vira competição e o aluno abre: o id novo (UUID) não pode sair cortado no "quiz:<id>"
geradas = qs if st.get("falsa") else [{"pergunta": f"Pergunta {i}?", "certa": "sim", "erradas": ["não", "talvez", "nunca"]} for i in range(10)]
s, r = chamar("/planilha", "POST", {"acao": "salvarQuestionario", "titulo": f"IA {sufixo}", "perguntas": geradas}, prof)
quiz_ia = r.get("id", "")
confere("o questionário da IA é salvo como os da planilha", r.get("ok") and len(quiz_ia) == 36)
s, r = chamar("/planilha", "POST", {"acao": "criarCompeticao", "nome": "Competição da IA", "jogo": f"quiz:{quiz_ia}",
                                    "jogoNome": f"Questionário: IA {sufixo}", "encerra": (agora + timedelta(hours=1)).isoformat(), "turma": turma["id"]}, prof)
comp_ia = r.get("competicao", {})
confere("competição com o questionário da IA guarda o id inteiro", r.get("ok") and comp_ia.get("jogo") == f"quiz:{quiz_ia}", comp_ia.get("jogo", ""))
s, r = chamar("/sessions/aluno", "POST", {"codigo": turma["codigo"], "nome": "Aluno Quiz IA"})
s, r = chamar("/sessions/aluno/competicoes", token=r.get("token"))
vista = next((x for x in r.get("lista", []) if x["id"] == comp_ia.get("id")), {})
confere("o aluno vê a competição do questionário", vista.get("jogo") == f"quiz:{quiz_ia}")
s, r = chamar(f"/dados?acao=questionario&id={vista.get('jogo', 'quiz:')[5:]}&escola={slug}")
confere("ao clicar, o questionário da competição abre com as perguntas", r.get("ok") and len(r["questionario"]["perguntas"]) == len(geradas))
s, r = chamar("/dados", "POST", {"acao": "resultadoCompeticao", "escola": slug, "id": comp_ia.get("id"), "codigo": vista.get("codigo"),
                                 "nome": "Aluno Quiz IA", "pontos": 800, "acertos": 8, "total": 10, "config": "Questionário"})
confere("o aluno responde e entra no ranking", any(x.get("pontos") == 800 for x in r.get("ranking", [])))

# ---------- fim: a escola de teste fica desativada ----------
chamar(f"/turmas/{turma['id']}", "PUT", {"ativa": False}, prof)
chamar(f"/escolas/{escola['id']}", "PUT", {"ativa": False}, adm)
print(f"\nA escola de teste /{slug} ficou desativada.")
print("TUDO CERTO" if not falhas else f"FALHARAM {len(falhas)}: " + "; ".join(falhas))
sys.exit(1 if falhas else 0)
