# API — Jogos Psicopedagógicos

Login, escolas e usuários (fase 1 do plano em `docs/plano-sistema-com-login.md`).
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

## Regras

- **Perfis:** o administrador (sem escola) cria escolas e usuários de qualquer escola. A coordenação cadastra coordenação
  e professores só da própria escola. O professor não cadastra ninguém.
- **Teste grátis:** escola nova fica 14 dias no plano `teste`. Depois, ou se for desativada, tudo fica bloqueado
  (login, API e a página da escola), menos para o administrador, que pode ativar o plano ou estender o teste.
- **Senhas:** guardadas com bcrypt; a senha provisória precisa ser trocada no primeiro acesso; 10 tentativas erradas
  por minuto bloqueiam o login por 1 minuto.
