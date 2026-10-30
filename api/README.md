# API — Jogos Psicopedagógicos

Login, escolas e usuários (fase 1) e turmas, alunos e partidas (fase 2) painel do professor (fase 3) e os dados que eram da planilha (fase 4) do plano em `docs/plano-sistema-com-login.md`.
Mesma arquitetura do E-CGU: TypeScript, Express, Sequelize (MySQL), migrations e seeders do `sequelize-cli`,
JWT no cabeçalho `Authorization: Bearer`.

## Rodar tudo no computador (Docker)

Copie `.env.example` (na raiz) para `.env` e troque as senhas. Depois, suba os containers:

```bash
docker compose up -d --build
```

O app abre em http://localhost:8089, as escolas em http://localhost:8089/escolaExemplo e a API em http://localhost:8089/api/health.

Na primeira subida, a API cria as tabelas no banco `games` e cadastra o administrador (`ADMIN_EMAIL` / `ADMIN_SENHA`)
e a Escola Exemplo. Ela entra na Área do professor (menu ☰) com esse e-mail e senha.

## Rodar só a API (desenvolvimento)

```bash
cd api
cp .env.example .env      # DB_HOST=localhost, MySQL rodando na máquina
npm install
npm run migrate && npm run seed
npm run dev               # http://localhost:3333
```

## Rotas (o nginx publica em /api)

| Rota | Quem | O quê |
|---|---|---|
| `POST /sessions` | todos | login (e-mail + senha) → `{ token, usuario }` |
| `GET /sessions/eu` | logado | quem está logado |
| `PUT /usuarios/eu/senha` | logado | trocar a própria senha (obrigatório no primeiro acesso) |
| `GET/POST /usuarios`, `PUT /usuarios/:id` | admin, coordenação | cadastrar, desativar e dar senha provisória |
| `GET /escolas/:slug/marca` | público | nome, cores, logo e situação da escola |
| `GET/POST /escolas`, `PUT /escolas/:id` | admin | criar e editar escolas, plano e teste grátis |
| `POST /planilha` | logado | gravações do professor na planilha do Google (até a fase 4), com a senha só no servidor |
| `GET /pagina/:slug` | público | o app já com a marca da escola (o nginx manda `/<escola>` para cá) |
| `GET/POST /turmas`, `PUT /turmas/:id` | professor, coordenação, admin | turmas (com código); o professor vê só as dele |
| `GET/POST /turmas/:id/alunos`, `PUT /alunos/:id` | quem vê a turma | alunos (um nome por linha, opcional), desativar |
| `GET /turmas/codigo/:codigo/alunos` | público | os nomes da turma para a tela de entrada do aluno |
| `GET/POST /alunos`, `GET /alunos/:id` | coordenação, professor | alunos da escola (com ou sem turma), cadastro e histórico de anamneses; o professor vê todos da escola e mexe só nos das turmas dele |
| `GET/POST/PUT /anamneses/modelos` | coordenação, professor | modelos (questionários) de anamnese da escola |
| `POST /alunos/:id/anamneses` | quem mexe no aluno | anamnese presencial (exige o consentimento do responsável, LGPD) |
| `POST /alunos/:id/anamneses/link`, `PUT /anamneses/:id/cancelar` | quem mexe no aluno | link para a família (3 horas, uma resposta; no banco fica só o hash do token) |
| `GET/POST /anamnese-publica/:token` | público (com o token) | a página da família (`anamnese.html?t=`) |
| `POST /sessions/aluno`, `GET /sessions/aluno` | aluno | login sem senha: código da turma + aluno da lista (`aluno_id`) ou nome digitado (nome novo entra na turma) |
| `GET /sessions/aluno/competicoes` | aluno | as competições da turma do aluno logado |
| `POST /partidas` | aluno | o fim de cada jogo (id do aparelho: reenviar não duplica) |
| `GET /turmas/:id/partidas` | quem vê a turma | as últimas partidas da turma |
| `GET /turmas/:id/painel?dias=30` | quem vê a turma | painel: quem jogou, acerto, semanas, habilidades e as 3 maiores dificuldades |
| `GET /alunos/:id/ficha?dias=30` | quem vê a turma | ficha: evolução por semana, habilidades (antes × depois), jogos e o que revisar |
| `POST /testes` | público | teste grátis: nome, e-mail, perfil e aceite → token (o mesmo e-mail reaproveita o cadastro) |
| `POST /testes/relatorio` | teste grátis | o PDF do relatório de um jogo, mandado por e-mail (até 30 por dia) |
| `GET /testes` | admin | quem se cadastrou no teste grátis |
| `GET /dados?acao=…&escola=` | público | e-mails dos relatórios, questionários, competições e ranking (as mesmas ações e respostas do antigo script) |
| `POST /dados` | público | competição do aluno: `entrarCompeticao` e `resultadoCompeticao` |
| `POST /planilha` | logado | gravações do professor: `adicionarEmail`, `salvarQuestionario`, `criarCompeticao`, `competicoesProfessor`, `encerrarCompeticao` (no banco) |
| `POST /relatorios` | público | relatório de uma partida por e-mail: a API confere o destinatário e envia (com `EMAIL_VIA=smtp`, ela mesma, em `services/relatorioEmail.ts`; com `planilha`, pelo script do Google) |
| `POST /admin/importar-planilha` | admin | traz da planilha para o banco: escolas, e-mails, questionários, competições e ranking (pode repetir) |

## Regras

- **Perfis:** o administrador (sem escola) cria escolas e usuários de qualquer escola. A coordenação cadastra coordenação
  e professores só da própria escola. O professor não cadastra ninguém.
- **Teste grátis:** escola nova fica 14 dias no plano `teste`. Depois, ou se for desativada, tudo fica bloqueado
  (login, API e a página da escola), menos para o administrador, que pode ativar o plano ou estender o teste.
- **Senhas:** guardadas com bcrypt; a senha provisória precisa ser trocada no primeiro acesso; 10 tentativas erradas
  por minuto bloqueiam o login por 1 minuto.
- **Alunos:** só o nome e a turma, sem senha: o aluno entra com o código da turma e o nome (o mesmo nome, sem diferença
  de acentos e maiúsculas, é sempre o mesmo aluno). O app apaga o login quando o aluno volta à tela inicial.
- **Aluno em várias turmas:** o aluno é da escola e fica ligado às turmas em `aluno_turmas` (ou a nenhuma: só mapeado
  para análise). O token do aluno guarda a turma por onde ele entrou: as partidas e as competições são dessa turma.
- **Anamnese:** modelos (`anamnese_modelos`) e as aplicadas (`anamneses`, com a cópia das perguntas do dia). Dado
  sensível de criança: só a equipe da escola vê, o consentimento do responsável fica registrado no aluno e nada
  disso vai nos e-mails dos relatórios.
- **Competições:** cada uma é de uma turma (`competicoes.turma_id`); o aluno vê só as da turma dele. No ranking vale a
  maior nota de cada aluno; todas as partidas ficam no relatório do professor.
- **Administrador dentro de uma escola:** com o cabeçalho `X-Escola: <id da escola>`, o administrador é tratado como a
  coordenação daquela escola (só naquela requisição; nada é gravado no usuário). O app manda o cabeçalho depois de
  "🚪 Entrar na escola". Professor avulso = professor sem escola.
- **Partidas:** só de quem entrou pela turma. Sem internet, ficam numa fila no aparelho e vão quando a conexão volta.
  Cada partida guarda as rodadas (`detalhes`), o resumo, a competição (se for de uma) e as habilidades do jogo.
- **E-mail (relatórios das partidas e PDF do teste grátis):** com `EMAIL_VIA=smtp`, a API envia por SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SEGURO`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_REMETENTE`)
  e o relatório é montado em `services/relatorioEmail.ts` (os mesmos textos e HTML do script do Google):
  serve o e-mail da Hostinger, o Gmail (senha de app) ou o Resend. No computador, o `docker-compose.override.yml` sobe o
  Mailpit: os e-mails aparecem em http://localhost:8025 e nada sai de verdade.
- **Dados da planilha (fase 4):** e-mails, questionários, competições e ranking ficam no banco, cada escola com os seus
  (sem escola = plataforma principal). Com `EMAIL_VIA=planilha`, o Apps Script ainda é o **carteiro**: envia os
  relatórios e o PDF do teste grátis pelo Gmail da conta dele (por HTTPS, em qualquer rede); com `smtp`, a planilha não é usada. Links antigos de questionário (id da aba) continuam abrindo.
