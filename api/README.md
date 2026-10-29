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
| `GET/POST /turmas/:id/alunos`, `PUT /alunos/:id` | quem vê a turma | alunos (um nome por linha), figuras novas, desativar |
| `GET /turmas/codigo/:codigo/alunos` | público | os nomes da turma para a tela de entrada do aluno |
| `POST /sessions/aluno`, `GET /sessions/aluno` | aluno | login por figuras (código + aluno + 3 figuras) e conferência |
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
| `POST /relatorios` | público | relatório de uma partida por e-mail: a API confere o destinatário e o script do Google só envia (carteiro) |
| `POST /admin/importar-planilha` | admin | traz da planilha para o banco: escolas, e-mails, questionários, competições e ranking (pode repetir) |

## Regras

- **Perfis:** o administrador (sem escola) cria escolas e usuários de qualquer escola. A coordenação cadastra coordenação
  e professores só da própria escola. O professor não cadastra ninguém.
- **Teste grátis:** escola nova fica 14 dias no plano `teste`. Depois, ou se for desativada, tudo fica bloqueado
  (login, API e a página da escola), menos para o administrador, que pode ativar o plano ou estender o teste.
- **Senhas:** guardadas com bcrypt; a senha provisória precisa ser trocada no primeiro acesso; 10 tentativas erradas
  por minuto bloqueiam o login por 1 minuto.
- **Alunos:** só o nome de exibição (primeiro nome + inicial) e a turma. A senha é uma sequência de 3 figuras (de 9),
  legível para o professor (que mostra ao aluno); 5 erros seguidos travam aquele aluno por 1 minuto.
- **Partidas:** só de quem entrou pela turma. Sem internet, ficam numa fila no aparelho e vão quando a conexão volta.
  Cada partida guarda as rodadas (`detalhes`), o resumo, a competição (se for de uma) e as habilidades do jogo.
- **E-mail (teste grátis):** por SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SEGURO`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_REMETENTE`):
  serve o e-mail da Hostinger, o Gmail (senha de app) ou o Resend. No computador, o `docker-compose.override.yml` sobe o
  Mailpit: os e-mails aparecem em http://localhost:8025 e nada sai de verdade.
- **Dados da planilha (fase 4):** e-mails, questionários, competições e ranking ficam no banco, cada escola com os seus
  (sem escola = plataforma principal). O Apps Script ficou só como **carteiro**: envia os relatórios e o PDF do teste grátis
  pelo Gmail da conta dele (por HTTPS, em qualquer rede). Links antigos de questionário (id da aba) continuam abrindo.
