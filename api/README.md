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
| `PUT /usuarios/eu/senha` | logado (todos os perfis, o responsável também) | trocar a própria senha (`{ senhaAtual, novaSenha }`, 8+ caracteres; obrigatório no primeiro acesso). Na gestão: menu da conta; na área da família: "Alterar a minha senha" |
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
| `POST /sessions/aluno`, `GET /sessions/aluno` | aluno | login sem senha: código da turma + aluno da lista (`aluno_id`) ou nome digitado (nome novo entra na turma). O aluno cadastrado pela família precisa do `pin`: sem ele → 401 `pin` (com `aluno`); errado → 401 `pin_errado` (`restantes`); 5 erros → 423 `pin_bloqueado` por 5 minutos. Token de 12 h com `sv` (a `sessao_versao` do aluno); a resposta traz `aluno.cadastrado` (tem PIN: o app lembra o login até o fim do dia) e `aluno.local` (`escola`). Trocar o PIN derruba os tokens antigos: 401 `sessao_trocada` |
| `GET /sessions/aluno/competicoes` | aluno | as competições da turma do aluno logado (em casa sem turma: lista vazia) |
| `POST /partidas` | aluno | o fim de cada jogo (id do aparelho: reenviar não duplica). `local` vem do token (`casa` na entrada pela conta do responsável), não do corpo; em casa vai com a turma de agora do aluno, ou sem turma |
| `GET /turmas/:id/partidas` | quem vê a turma | as últimas partidas da turma |
| `GET /turmas/:id/painel?dias=30` | quem vê a turma | painel: quem jogou, acerto, semanas, habilidades e as 3 maiores dificuldades |
| `GET /alunos/:id/ficha?dias=30` | quem vê a turma | ficha: evolução por semana, habilidades (antes × depois), jogos e o que revisar |
| `POST /testes` | público | teste grátis: nome, e-mail, perfil e aceite → token (o mesmo e-mail reaproveita o cadastro) |
| `POST /testes/relatorio` | teste grátis | o PDF do relatório de um jogo, mandado por e-mail (até 30 por dia) |
| `GET /testes` | admin | quem se cadastrou no teste grátis |
| `GET /dados?acao=…&escola=` | público | e-mails dos relatórios, questionários, competições e ranking (as mesmas ações e respostas do antigo script) |
| `POST /dados` | público | competição do aluno: `entrarCompeticao` e `resultadoCompeticao` |
| `POST /planilha` | logado | gravações do professor: `adicionarEmail`, `salvarQuestionario`, `criarCompeticao`, `competicoesProfessor`, `encerrarCompeticao` (no banco) |
| `GET /questionarios/ia` | professor, coordenação (admin com `X-Escola`) | a IA está configurada? `{ configurada, falsa, limite, usadasHoje, restantes }` |
| `POST /questionarios/gerar-ia` | professor, coordenação (admin com `X-Escola`) | questões por IA: `{ arquivos: [base64 de JPG/PNG/WEBP/PDF] (até 6, 10 MB cada, 14 MB juntos), quantidade: 5\|10\|15 (padrão 10), dificuldade?: facil\|media\|dificil, materia?, tema?, serie? }` → `{ perguntas: [{ pergunta, certa, erradas[] }], provedor, restantes }` (o formato da planilha; nada é salvo: o professor revisa e salva com `salvarQuestionario`). Erros: 400 arquivo inválido, 413 grande demais, 429 `limite_diario`, 503 `ia_nao_configurada`, 422 sem conteúdo legível |
| `POST /relatorios` | público | relatório de uma partida por e-mail: a API confere o destinatário e envia (com `EMAIL_VIA=smtp`, ela mesma, em `services/relatorioEmail.ts`; com `planilha`, pelo script do Google) |
| `POST /admin/importar-planilha` | admin | traz da planilha para o banco: escolas, e-mails, questionários, competições e ranking (pode repetir) |
| `GET /alunos/:id/responsaveis` | quem mexe no aluno | responsáveis ligados ao aluno |
| `PUT /alunos/:id/pin` | quem edita o aluno (coordenação, admin, professor das turmas dele, professor avulso dono do paciente) | a escola redefine o PIN do aluno cadastrado (`{ pin, pin_confirmacao }`, mesmas regras; destrava). Responsável = 403 (usa `/familia/filhos/:id/pin`) |
| `PUT /alunos/:id/responsaveis/:responsavelId/senha` | coordenação, admin, professor avulso dono (`podeDecidirFamilia`) | senha provisória para o responsável ligado ao aluno (`{ senha }`, 8+; a tela gera e mostra uma vez). A senha atual nunca aparece; marca `primeiro_login` e ele cria a própria no próximo acesso |
| `DELETE /alunos/:id/responsaveis/:responsavelId` | coordenação, admin, professor avulso dono | tira o responsável do aluno (a conta continua) |
| `GET/POST /alunos/:id/recados`, `PUT/DELETE /recados/:id` | ver: quem vê o aluno; escrever: quem mexe no aluno; corrigir/apagar: quem escreveu ou a coordenação | recados para a família (separados das observações internas) |
| `GET/PUT /visivel-familia` | coordenação (admin dentro da escola), professor avulso | o que a família vê: `{ jogos, recados, plano, anamnese }` (true/false) |
| `GET/PUT /alunos/:id/visivel-familia` | ver: quem vê o aluno; mudar: coordenação, admin, professor avulso dono | exceção na ficha do aluno (true/false sobrepõe; `null` volta à regra) → `{ excecao, regra, efetivo, pode_mudar }` |
| `GET/PUT /cadastro-familia/config` | coordenação (admin dentro da escola), professor avulso | a página de cadastro da família: `{ aceita, caminho }` (`/<escola>/cadastro` ou `/cadastro/<apelido>`, gerado do nome); o PUT `{ aceita: true\|false }` abre ou fecha |
| `GET /cadastro-familia/publico/escola/:slug`, `.../profissional/:apelido` | público | o que a página mostra: `{ tipo, aberta, escola, profissional }` |
| `POST /cadastro-familia/publico/escola/:slug`, `.../profissional/:apelido` | público (página aberta) | `{ consentimento: true, nome, email, senha, parentesco?, filhos: [{ nome, nome_completo?, data_nascimento?, pin, pin_confirmacao }] }` (PIN de 4 números; recusa 0000, 1234, 4321...): cria a conta (ou usa a que já tem esse e-mail, se a senha confere) e os alunos — na escola sem turma (`aguardando_turma`), no professor avulso como pacientes (`alunos.professor_id`) → `{ token, usuario, alunos }` |
| `GET /familia/filhos` | responsável | os filhos ligados à conta, `tem_pin` e quais relatórios aparecem para cada um |
| `POST /familia/filhos/:id/entrar` | responsável | jogar em casa ("Quem vai jogar?" no app): `{ pin }` do filho → `{ token, aluno }` (token de aluno de 30 dias, `local: casa`, sem turma de entrada; vale enquanto o responsável estiver ativo e ligado ao filho). Mesmos erros do PIN da entrada pela turma (401 `pin`/`pin_errado`, 423 `pin_bloqueado`); sem PIN = 409 `sem_pin`; filho de outro = 403 |
| `GET /familia/codigo`, `POST /familia/codigo/novo` | responsável | o código da família (`FAM-XXXXX`, nasce no primeiro pedido) e gerar outro: o antigo para de valer e os logins feitos com ele caem (401 `familia_trocada`). A equipe não vê o código |
| `GET /familia-codigo/:codigo` | público (20 erros/min por IP) | o aparelho do filho, sem a conta do pai: `{ filhos: [{ id, nome }] }` (só o apelido; só ativos, com PIN e escola liberada). Aceita sem o `FAM-` e em minúsculas; código que não existe = 404 |
| `POST /familia-codigo/:codigo/entrar` | público (mesmo limite) | `{ aluno_id, pin }` → `{ token, aluno }` (30 dias, `local: casa`, o token leva o código). Mesmos erros do PIN; aluno de outra família = 404 |
| `PUT /familia/filhos/:id/pin` | responsável | troca o PIN do filho (`{ pin, pin_confirmacao }`), destrava se ele estava bloqueado e derruba os logins lembrados dele (`sessao_versao` + 1, também no `PUT /alunos/:id/pin`); PIN fácil (0000, 1234) ou os dois diferentes = 400; filho de outro = 403. Na tela: "Trocar PIN" em cada filho em `/gestao/familia` |
| `GET/PUT /familia/filhos/:id` | responsável | dados do filho; o PUT corrige só `nome_completo` e `data_nascimento` |
| `GET /familia/filhos/:id/jogos?dias=30` | responsável (chave `jogos`) | desempenho (a mesma ficha dos jogos, sem as anotações da equipe) e as últimas partidas (`local`: escola/casa) |
| `GET /familia/filhos/:id/recados` | responsável (chave `recados`) | recados para a família |
| `GET /familia/filhos/:id/planos` | responsável (chave `plano`) | planos ativos/concluídos (sem rascunho e sem as adequações da escola) |
| `GET /familia/filhos/:id/anamneses` | responsável | as que a família respondeu (sempre) e as da equipe (chave `anamnese`) |

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
- **Família (perfil `responsavel`):** pai/mãe com login próprio (mesma tabela `usuarios`), ligado aos filhos em
  `responsavel_alunos` (N:N, com parentesco, origem e consentimento). Entra pela página de cadastro da escola ou do professor
  avulso. As rotas da equipe barram o responsável logo na entrada (`carregarUsuarioLogado` → 403 `area_da_familia`);
  ele só usa `/familia/*`, `/sessions/eu` e a troca de senha (`carregarContaLogada`). Nunca vê observações internas
  nem alunos que não são filhos dele (403). O que ele vê passa por `familiaPodeVer` (`services/acessoAluno.ts`):
  exceção do aluno → chave de quem produziu (a escola do autor, ou o professor avulso autor; jogos: a escola do aluno
  ou o professor avulso das turmas dele) → padrão (jogos e recados ligados, plano e anamnese desligados). Sem escola
  nem profissional, a família vê tudo. As anamneses que a família respondeu aparecem sempre.
  Página de cadastro de endereço fixo (`cadastro.html`, servida pelo nginx em `/<escola>/cadastro` e
  `/cadastro/<apelido>`), aberta ou fechada pela chave `aceita_cadastro_familia` (começa desligada). Paciente sem turma do
  professor avulso = `alunos.professor_id` (ele vê e edita). O aluno cadastrado pela família tem PIN de 4 números
  (`alunos.pin_hash`, bcrypt; `services/pin.ts`); o aluno avulso continua sem senha. `alunos.senha_figuras` nunca foi
  conferida e fica sem uso. Aluno sem escola nem profissional (compra avulsa) não tem anamnese (`alunoTemDono`).
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
- **Questões por IA (`services/geradorQuestoes.ts`):** Google Gemini no plano grátis (`GEMINI_API_KEY`, modelo `GEMINI_MODELO`,
  padrão gemini-3.5-flash) com JSON estrito (responseSchema), e Groq de reserva (`GROQ_API_KEY`): PDF pelo texto tirado no
  servidor (`GROQ_MODELO`), foto só com modelo de visão (`GROQ_MODELO_VISAO`). Repete com pausas em 500/503 e troca sozinha
  de modelo se o atual for aposentado (mesma ideia do gerenciadorReunioesIA). `IA_PRINCIPAL=groq` inverte a ordem.
  A resposta é conferida no servidor (descarta incompletas e duplicadas). Os arquivos ficam só na memória da requisição
  (nunca são gravados); cada geração que deu certo vai para a tabela `uso_ia` (quem, quando, provedor), que conta o
  limite por pessoa por dia (`IA_LIMITE_DIARIO`, padrão 20). `IA_FALSA=1` devolve perguntas fixas (teste automático).
