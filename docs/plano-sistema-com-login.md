# Plano técnico: Pedagogia Gamificada com login e banco de dados

> Status: **proposta para aprovação** · 29/10/2026
> Objetivo: trocar a planilha do Google (Apps Script) por um servidor com banco de dados e login,
> **mantendo os 36 jogos, o visual, o PWA e as escolas com marca própria**.

---

## 1. Ponto de partida (como está hoje)

| Parte | Hoje | Problema |
|---|---|---|
| App | HTML/CSS/JS estático (PWA), 43 módulos em `js/`, 36 jogos | — (fica) |
| Dados | Planilha do Google via `ferramentas/relatorio-email.gs` | lento (1–3 s), cotas do Google, uma planilha/script por escola |
| Login do aluno | só o primeiro nome (`PEDIR_SENHA = false`) | não dá para saber quem é quem nem juntar o histórico |
| Login do professor / admin | senhas fixas `app0707` / `app1234` **dentro do JavaScript** | qualquer um vê as senhas no código do site |
| Relatório | e-mail no fim da partida + linha na aba "Relatórios" | não há evolução ao longo do tempo nem painel |
| Escolas | aba "Escolas" + `?escola=` / `/escola` | precisa implantar um script por escola para separar os dados |

O que a planilha faz hoje (16 ações do Apps Script) e para onde vai:

| Ação de hoje | Vira |
|---|---|
| `emails`, `adicionarEmail` | professores cadastrados (com login) e destinatários de relatório |
| `questionarios`, `questionario`, `salvarQuestionario` | tabelas `questionarios` e `perguntas` |
| `competicoes`, `competicoesProfessor`, `criarCompeticao`, `encerrarCompeticao`, `entrarCompeticao`, `resultadoCompeticao`, `ranking` | tabelas `competicoes` e `participacoes` |
| `escola`, `escolasAdmin`, `salvarEscola` | tabela `escolas` (painel do administrador) |
| `entrar` (senha do professor) | login de verdade (e-mail + senha) |
| envio do relatório (POST sem ação) | tabela `partidas` + e-mail opcional |

---

## 2. Arquitetura proposta

```
celular / tablet / PC  ──►  nginx (Dokploy, HTTPS)
                              ├─ /            → app estático (os jogos de hoje)
                              ├─ /<escola>    → mesmo app, já com a marca da escola no HTML
                              └─ /api/*       → API Node.js ──► PostgreSQL
                                                   └─► serviço de e-mail (Resend ou Amazon SES)
```

**Escolhas (recomendação):**

- **API: Node.js 22 + Express + Sequelize.** É a mesma base do sistema E-CGU, então o código fica familiar.
- **Banco: PostgreSQL 16.** Guarda bem os detalhes de cada partida em JSON (`jsonb`) e permite consultas rápidas para os gráficos.
- **Sessão: cookie `httpOnly`** no mesmo domínio (`/api`), em vez de token no `localStorage`. É mais seguro e funciona no PWA instalado.
- **Senhas:** guardadas com hash `argon2` (ou `bcrypt`), nunca em texto.
- **E-mail: Resend** (ou Amazon SES), que não tem as cotas do Gmail. O relatório por e-mail continua como opção.
- **Hospedagem:** a VPS da Hostinger que já existe, com `docker-compose` no Dokploy (web + api + db + backup).

**Sem flash da marca:** o servidor já entrega o `index.html` da escola com o nome, as cores e o logo. O carregando que existe hoje só continua no modo sem internet.

---

## 3. Perfis e login

| Perfil | Como entra | O que pode |
|---|---|---|
| **Administrador** (plataforma) | e-mail + senha (+ código no e-mail, opcional) | cria e edita escolas, planos e teste grátis; vê números gerais |
| **Coordenação** (escola) | e-mail + senha | cadastra professores e turmas da escola; vê todas as turmas |
| **Professor** | e-mail + senha (ou "Entrar com Google", fase 5) | as suas turmas e alunos, questionários, competições, painel de evolução |
| **Aluno** | **código da turma → toca no nome → senha de figuras** (ex.: 🐶🍎⭐) | joga; vê as próprias estrelas e o ranking |
| **Visitante** (teste grátis) | sem login | joga sem guardar o histórico (como hoje) |

Detalhes do login do aluno:

- O professor cria a turma e recebe um **código curto** (ex.: `K7PM2`, sem 0/O e 1/I, como os códigos de competição de hoje).
- Na primeira vez, o aluno digita o código; o aparelho **lembra a turma**. Depois é só tocar no nome e na senha de figuras.
- A senha de figuras é uma sequência de **3 figuras escolhidas entre 9** (729 combinações). O professor pode ver e trocar a senha do aluno.
- Depois de 5 erros seguidos, o login daquele aluno trava por 1 minuto, para evitar tentativa e erro.

---

## 4. Banco de dados (tabelas principais)

Toda tabela de dados de escola tem `escola_id`. A API sempre filtra por ele, então uma escola nunca vê os dados de outra.

```
escolas         id, slug (endereço), nome, slogan, cor, destaque, logo, plano, teste_ate, ativa, criada_em
usuarios        id, escola_id (nulo p/ admin), nome, email (único), senha_hash, perfil (admin|coordenacao|professor),
                ativo, ultimo_acesso
turmas          id, escola_id, nome (ex.: "3º ano B"), codigo (único), ano_letivo, ativa
turma_professor turma_id, usuario_id                       ← uma turma pode ter mais de um professor
alunos          id, escola_id, turma_id, nome_exibicao (primeiro nome + inicial), senha_figuras_hash,
                ativo, criado_em                            ← sem CPF, sem data de nascimento, sem foto
partidas        id, escola_id, aluno_id (nulo p/ visitante), turma_id, jogo (ex.: 'fracoes'), nivel_max,
                acertos, total, pontos, estrelas, duracao_s, iniciada_em, terminada_em,
                detalhes jsonb                              ← a lista `resultados` de hoje (cada rodada: tipo, certa, erros, nível, tempo)
                resumo jsonb                                ← `missao.resumo` de hoje
partida_habilidades  partida_id, habilidade (ex.: 'memoria'), acertos, total   ← para os gráficos por habilidade
questionarios   id, escola_id, autor_id, titulo, criado_em, publicado
perguntas       id, questionario_id, ordem, enunciado, certa, erradas (text[]), explicacao
competicoes     id, escola_id, autor_id, nome, jogo, codigo, config jsonb, encerra_em, encerrada
participacoes   competicao_id, aluno_id (ou nome do visitante), pontos, acertos, respondidas, partidas, melhor_em
destinatarios   id, escola_id, nome, email                  ← quem recebe relatório por e-mail (opcional)
auditoria       id, escola_id, usuario_id, acao, quando     ← quem criou/apagou o quê (LGPD)
```

As habilidades de cada jogo já estão em `js/habilidades.js`. A API usa a mesma lista para preencher `partida_habilidades`.

---

## 5. API (rotas)

Todas ficam em `/api`, respondem em JSON e checam o perfil e a escola do usuário logado.

```
Sessão
  POST   /api/login                    professor/coordenação/admin (e-mail + senha)
  POST   /api/login/aluno              { codigoTurma, alunoId, figuras }
  GET    /api/turma/:codigo/alunos     nomes da turma para a tela "toque no seu nome"
  POST   /api/logout
  GET    /api/eu                       quem está logado
  POST   /api/senha/esqueci  ·  POST /api/senha/nova

Escola (marca)
  GET    /api/escola/:slug             nome, cores, logo (público)

Partidas
  POST   /api/partidas                 o fim de cada jogo (o mesmo conteúdo do relatório de hoje)
  GET    /api/alunos/:id/partidas      histórico do aluno
  GET    /api/alunos/:id/evolucao      por semana e por habilidade
  GET    /api/turmas/:id/painel        resumo da turma (quem jogou, dificuldades por habilidade)
  GET    /api/partidas/:id/pdf         relatório em PDF

Turmas e alunos (professor / coordenação)
  CRUD   /api/turmas  ·  /api/turmas/:id/alunos  (importar lista colando nomes)

Questionários e competições
  CRUD   /api/questionarios  ·  POST /api/questionarios/importar (planilha .xlsx, como hoje)
  CRUD   /api/competicoes  ·  POST /api/competicoes/:id/entrar  ·  GET /api/competicoes/:id/ranking

Administração (só admin)
  CRUD   /api/admin/escolas  ·  /api/admin/usuarios  ·  GET /api/admin/numeros
```

---

## 6. O que muda no app (front-end)

**Fica igual:** os 36 jogos, as telas de instruções, o visual, os sons, o filtro de habilidades, o PWA e o manual.

**Muda:**

1. **Novo `js/api.js`:** um único lugar com `fetch('/api/...')`. Ele substitui as chamadas ao Apps Script espalhadas em `relatorio.js`, `professor.js`, `quiz.js`, `competicao.js` e `escola.js`.
2. **`fimDaMissao()` (relatorio.js):** além de mostrar o relatório, faz `POST /api/partidas`. **Sem internet, a partida fica numa fila no aparelho** (IndexedDB) e é enviada quando a conexão volta.
3. **Tela de login:**
   - aluno: código da turma, nome e figuras;
   - professor: e-mail e senha;
   - continua existindo o "Jogar sem login" do teste grátis.
4. **Saem do código** `SENHA_PROFESSOR`, `SENHA_ADMIN`, `SENHA_TURMA`, `URL_RELATORIO` e a escolha de professor pela busca: o relatório vai para os professores da turma do aluno.
5. **Área do professor nova:**
   - turmas e alunos;
   - painel da turma;
   - ficha do aluno (evolução e habilidades);
   - questionários e competições (as telas de hoje, agora ligadas à API).
6. **Painel do administrador:** escolas, planos e teste grátis (as telas de escolas de hoje, agora ligadas à API).

---

## 7. Painel do professor (o grande ganho)

- **Turma, numa tela:** quem jogou na semana, minutos jogados, % de acertos e as **3 habilidades com mais dificuldade**.
- **Ficha do aluno:**
  - linha do tempo de acertos por semana;
  - radar das habilidades (memória, atenção, raciocínio…);
  - jogos favoritos;
  - "para revisar" juntando todas as partidas.
- **Comparação antes × depois** de um período (ex.: bimestre), pronta para reunião com os pais ou para o laudo psicopedagógico.
- **PDF** do aluno e da turma.

---

## 8. LGPD (dados de crianças)

- **Dados mínimos:** primeiro nome + inicial e turma. Nada de CPF, data de nascimento, foto ou e-mail do aluno.
- **Base legal:** a escola é a controladora dos dados e a plataforma é a operadora. Precisa de um **termo de tratamento de dados** com cada escola, e a escola colhe o consentimento dos responsáveis.
- **Direitos:** apagar um aluno (e as partidas dele) e exportar os dados dele, pelo painel da escola.
- **Segurança:**
  - HTTPS;
  - senhas com hash;
  - cada escola isolada pelo `escola_id`;
  - auditoria de quem apagou ou exportou;
  - **backup diário** criptografado, guardado fora da VPS.
- Atualizar a política de privacidade (a página `privacidade` já é reservada no app).

---

## 9. Infraestrutura (Dokploy na VPS)

```
docker-compose.yml
  web     nginx: app estático + proxy /api (o Dockerfile/nginx.conf de hoje, com o bloco /api)
  api     node:22-alpine  (a API)
  db      postgres:16-alpine  (volume persistente; porta fechada para fora)
  backup  pg_dump diário → arquivo criptografado → envio para fora (ex.: Backblaze B2 / Google Drive)
```

- Variáveis no Dokploy: `DATABASE_URL`, `SESSAO_SEGREDO`, `RESEND_API_KEY`, `ADMIN_EMAIL`.
- Domínio: `pedagociagamificada.com.br` apontando para a VPS (o DNS A `@`/`www` → `187.127.60.12`, pendente desde o deploy do Docker).
- **Custos novos:**
  - serviço de e-mail: grátis até cerca de 3 mil e-mails por mês no Resend;
  - armazenamento de backup: centavos por mês.
  - A VPS já está paga.

---

## 10. Fases

Cada fase vai para o ar sozinha, sem parar o app de hoje.

| Fase | Entrega | Pronto quando… | Tamanho |
|---|---|---|---|
| **1. Base** | API + banco + Docker; login de admin/coordenação/professor; escolas no banco; marca servida no HTML | o professor entra com e-mail e senha, a escola abre sem flash e as senhas fixas saíram do código | M |
| **2. Turmas e alunos** | turmas com código, alunos, login por figuras; `POST /api/partidas` com fila sem internet | uma partida jogada aparece no banco com o aluno certo, mesmo se jogada sem internet | M |
| **3. Painel** | painel da turma, ficha do aluno, gráficos por habilidade, PDF | o professor vê a evolução de um aluno em 4 semanas de partidas | G |
| **4. Migração** | questionários, competições e ranking na API; script que copia a planilha para o banco; desligar o Apps Script | nenhuma tela chama mais o Apps Script | M |
| **5. Extras** | planos e teste grátis com data, "Entrar com Google", avisos por e-mail (ex.: "turma sem jogar há 7 dias") | — | P a M |

**Convivência durante a transição:** uma configuração por escola (`usa_api: sim/não`). As escolas migram uma de cada vez. Enquanto isso, quem ainda está no Apps Script continua funcionando como hoje.

**Migração dos dados da planilha:**
- uma ação nova `exportar` no Apps Script, protegida pela senha de admin, devolve tudo em JSON: escolas, e-mails, questionários, competições, ranking e a aba Relatórios;
- um script importa esse JSON no banco;
- os relatórios antigos entram como partidas "sem aluno identificado".

---

## 11. Decisões para você tomar

1. **Banco:** PostgreSQL (recomendado) ou MySQL, que você já usa no E-CGU?
2. **Login do aluno:** senha de figuras (recomendado para crianças) ou senha numérica de 4 dígitos?
3. **Relatório por e-mail:** continua automático em toda partida, vira um resumo semanal, ou fica só no painel?
4. **Coordenação:** cada escola terá um perfil de coordenação, ou o professor faz tudo?
5. **Onde o código da API mora:** pasta `api/` neste mesmo repositório (recomendado: um deploy só) ou um repositório separado?
6. **Teste grátis:** quantos dias, e o que fica bloqueado depois (painel? número de alunos?).

Com essas respostas, a fase 1 começa por: `docker-compose.yml`, estrutura da `api/`, tabelas `escolas` e `usuarios`, rotas de login e a tela de login do professor.
