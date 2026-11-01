# Jogos Pedagógicos (Pedagogia Gamificada)

Plataforma de jogos psicopedagógicos + gestão escolar/clínica. Produção: https://gamespedagogicos.store
(painel do servidor: https://painel.gamespedagogicos.store). Branch de trabalho: **`sistema-com-login`**
(a `main` é o app antigo, sem login). Usuário: Marco (fala português; respostas em português).

## Arquitetura

| Parte | Onde | Tecnologia |
|---|---|---|
| App dos jogos (PWA, offline) | `index.html`, `style.css`, `js/*.js` (ES modules) | HTML/CSS/JS puro, sem build |
| Gestão (prof., coordenação, admin) | hoje dentro do `index.html`; **migrando para `gestao/`** (React + Vite + TS + MUI) — skill `gestao-react` | — |
| API | `api/src` (controllers, models, routes, services, middlewares, database/migrations) | Node + Express + TS + Sequelize (padrão skill `meu-stack`) |
| Banco | MySQL 8 (Docker), migrações rodam sozinhas quando a API sobe | — |
| Servidor | `docker-compose.yml`: mysql, api, web (nginx: `/` app, `/api` → api, `/<escola>` → página da escola) | VPS Hostinger + Dokploy |
| Página da família | `anamnese.html` + `js/anamnese-publica.js` (link de 3 h) | — |

## Comandos

- Subir local: `docker compose up -d --build` → http://localhost:8089 · e-mails de teste: http://localhost:8025
- Banco local: 127.0.0.1:**3307**, root, senha = `DB_PASSWORD` do `.env`, schema `games`
- **Teste automático (rodar depois de mudar a API):** `python docs/testes/testar-fluxos.py` → tem que dar **TUDO CERTO**
- Massa de teste (escolas Aurora/Horizonte/Saber): `python docs/testes/criar-massa-de-teste.py`
- **Mudou `index.html`, `style.css` ou `js/`:** `powershell -ExecutionPolicy Bypass -File ferramentas\versao.ps1` (sobe o `?v=` e o service worker)
- Arquivo JS novo no app: incluir na lista `ARQUIVOS` do `service-worker.js`
- Deploy: skill `deploy-jogos` (resumo: testar → versão → commit/push → backup → Deploy no Dokploy → conferir)

## Regras do domínio (não quebrar)

- Perfis: `admin` (pode "entrar na escola" com o cabeçalho `X-Escola` e vira coordenação), `coordenacao` (só a escola),
  `professor` (turmas dele; **vê** alunos/anamneses/observações/planos da escola toda, **edita** só os das turmas dele),
  professor avulso (sem escola). Aluno: código da turma + nome, sem senha; perde o login ao voltar ao início.
- Acesso a aluno: sempre por `api/src/services/acessoAluno.ts` (`podeVerAluno`, `podeEditarAluno`); turma: `acessoTurma.ts`.
- Aluno ↔ turma é N:N (`aluno_turmas`); o token do aluno guarda a turma por onde entrou.
- Anamnese/observações/plano = dado sensível de criança (LGPD): exige consentimento, nunca vai em e-mail de relatório.
- Relatório completo de permissões: fim do `TESTE-LOCAL.md` (local, fora do git, tem senhas).

## Padrões de código

- Código e mensagens em **português**; comentários explicam o porquê; arquivos com CRLF (editar com a ferramenta Edit).
- Telas de cadastro: botão "＋ Novo…" abre **popup** (no celular, folha de baixo; botões presos no rodapé); listas com
  **busca + filtros em select** (com contagem), nada de chips com rolagem lateral. Funcionar no celular e no PC.
- API: controller em classe (`export default new XController()`), validar no início, `{ message }` nos erros.
- Mudança de banco = **migração nova** em `api/src/database/migrations` (nunca editar uma que já rodou em produção).
- Ao terminar mudança de API: rodar `testar-fluxos.py` e acrescentar a parte nova do teste.

## Economia de tokens (skill `economizar-tokens`)

- Ler só o trecho necessário (grep antes de abrir arquivo grande: `index.html` ~2.600 linhas, `style.css` ~3.000).
- Quando o Marco disser "não precisa testar, eu testo": só atualizar o localhost e avisar.
- Uma sessão nova por tarefa grande; não repetir contexto que está aqui.
- Senhas: nunca no chat nem no git — ficam em `.env`, `.env.producao` e `TESTE-LOCAL.md` (todos no `.gitignore`).

## Documentos

`docs/PUBLICAR-NA-VPS.md` (VPS, DNS Locaweb, firewall, certificado) · `docs/ATUALIZAR-PRODUCAO.pdf` (deploy) ·
`docs/ROTEIRO-DE-TESTES.md` · `docs/COMO-RODAR-EM-OUTRA-MAQUINA.md` · `api/README.md` (rotas)
