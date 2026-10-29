# Como rodar o sistema (com login e banco) em outra máquina

Passo a passo para baixar o projeto do GitHub e abrir o sistema no **localhost**, para continuar o trabalho.
O sistema novo está na branch **`sistema-com-login`** (a `main` é o app que está no ar).

---

## 1. Instalar (uma vez só)

| Programa | Para quê | Onde baixar |
|---|---|---|
| **Git** | baixar o código | https://git-scm.com/download/win |
| **Docker Desktop** | rodar o banco, a API e o app | https://www.docker.com/products/docker-desktop/ |
| VS Code (opcional) | editar o código | https://code.visualstudio.com/ |
| Node.js 20 (opcional) | só para mexer na API fora do Docker | https://nodejs.org/ |

No Windows, o Docker Desktop pede o **WSL 2** na instalação: aceite e reinicie o computador.
Depois, abra o Docker Desktop e espere aparecer **"Engine running"**.

---

## 2. Baixar o projeto

No terminal (PowerShell ou Git Bash), entre na pasta onde ficam os projetos (ex.: `C:\dev`). Baixe o projeto:

```bash
git clone https://github.com/MarcoAurello/jogoOrtografia.git
```

Entre na pasta e troque para a branch do sistema novo:

```bash
cd jogoOrtografia
git switch sistema-com-login
```

---

## 3. Criar o arquivo `.env` (as senhas ficam só na máquina)

O `.env` **não vai para o git**. Crie a partir do modelo:

```bash
copy .env.example .env
```

Abra o `.env` e preencha (os valores abaixo são exemplos; invente os seus):

| Linha | O que colocar |
|---|---|
| `DB_PASSWORD` | uma senha para o banco (ex.: `banco-local-2026`) |
| `JWT_SECRET` | uma frase longa e aleatória (ex.: 40 letras misturadas) |
| `ADMIN_EMAIL` / `ADMIN_SENHA` | o administrador da plataforma (senha com 8 caracteres ou mais) |
| `URL_PLANILHA` | já vem com o endereço da planilha principal (não precisa mudar) |
| `SENHA_PLANILHA` | a `SENHA_PROFESSOR` do script do Google (hoje `app0707`) |
| `SENHA_ADMIN_PLANILHA` | a `SENHA_ADMIN` do script do Google (hoje `app1234`) |
| `EMAIL_VIA` | `planilha` (o Gmail da planilha envia) ou `smtp` (caixa de teste, veja o passo 4) |
| `FRONTEND_URL` | `http://localhost:8089` |

---

## 4. (Opcional) Ver o banco e a caixa de e-mail de teste

Crie, na pasta do projeto, o arquivo **`docker-compose.override.yml`** (ele também fica fora do git):

```yaml
services:
  mysql:
    ports:
      - "3307:3306"
  mailpit:
    image: axllent/mailpit:v1.21
    ports:
      - "8025:8025"
```

- **Banco** no MySQL Workbench, DBeaver ou HeidiSQL: host `127.0.0.1`, porta `3307`, usuário `root`, senha = `DB_PASSWORD`, banco `games`.
- **Caixa de e-mail de teste**: http://localhost:8025. Para os e-mails do app caírem nela (sem enviar de verdade), use no `.env`:
  `EMAIL_VIA=smtp`, `SMTP_HOST=mailpit`, `SMTP_PORT=1025`.

---

## 5. Subir o sistema

Na pasta do projeto, suba os containers (na primeira vez demora alguns minutos):

```bash
docker compose up -d --build
```

Quando terminar, abra:

| O quê | Endereço |
|---|---|
| App | http://localhost:8089 |
| Uma escola | http://localhost:8089/escolaExemplo |
| A API está no ar? | http://localhost:8089/api/health (responde `{"status":"ok"}`) |

Na primeira subida, a API cria as tabelas no banco `games`, o **administrador** do `.env` e a **Escola Exemplo**.

---

## 6. Trazer os dados

O banco **não vem pelo git**: a máquina nova começa vazia. Há dois jeitos de ter os dados.

### a) Da planilha do Google (escolas, e-mails, questionários, competições)

1. Abra o app: menu ☰ → **Área do professor** → entre com o `ADMIN_EMAIL` e a `ADMIN_SENHA` do `.env`.
2. Abra **🏫 Escolas** e toque em **📥 Importar da planilha**. Pode levar um minuto.

Pode repetir quando quiser: o que já veio não se repete.

### b) Copiar o banco da outra máquina (turmas, alunos, partidas, usuários de teste)

**Na máquina antiga**, na pasta do projeto, gere o arquivo `banco-games.sql`:

```bash
docker compose exec -T mysql sh -c "mysqldump -uroot -p\"$MYSQL_ROOT_PASSWORD\" games" > banco-games.sql
```

Leve o arquivo `banco-games.sql` para a pasta do projeto na máquina nova (por pendrive ou Google Drive).
O arquivo tem dados de alunos: **não coloque no git** nem compartilhe.

**Na máquina nova**, depois do passo 5, carregue o arquivo no banco:

```bash
docker compose exec -T mysql sh -c "mysql -uroot -p\"$MYSQL_ROOT_PASSWORD\" games" < banco-games.sql
```

As contas (administrador, professores, alunos e figuras) passam a ser as da máquina antiga.
No PowerShell, o `<` não funciona: rode esse comando no **Git Bash** ou no **Prompt de Comando**.

---

## 7. Dia a dia

Para trazer o que foi feito na outra máquina e reconstruir:

```bash
git pull
```

```bash
docker compose up -d --build
```

Para desligar (os dados ficam guardados):

```bash
docker compose stop
```

Para ligar de novo:

```bash
docker compose up -d
```

Para ver os erros da API:

```bash
docker compose logs api --tail 50
```

---

## 8. Se algo não funcionar

| Problema | O que fazer |
|---|---|
| `docker` não é reconhecido / "cannot connect" | Abra o Docker Desktop e espere "Engine running". |
| Porta 8089 (ou 3307) em uso | Troque `PORTA_WEB` no `.env` (ex.: `8090`) e suba de novo. |
| **502 Bad Gateway** logo depois de subir | Espere uns segundos (a API ainda está iniciando) e recarregue. |
| O app parece "velho" depois de uma mudança | Abra numa **janela anônima** (o app guarda cópia para funcionar sem internet). |
| Login do administrador não funciona | Confira `ADMIN_EMAIL`/`ADMIN_SENHA` no `.env`. O administrador só é criado se ainda não existir: mudar o `.env` depois não troca a senha. |
| Relatório para o professor não chega | A planilha precisa do **script versão 6** (`ferramentas/relatorio-email.gs`): Implantar → Gerenciar implantações → ✏️ → Nova versão. |
| Quero começar o banco do zero | `docker compose down -v` (**apaga todos os dados locais**) e depois `docker compose up -d --build`. |

---

## 9. Onde estão as coisas

| Pasta / arquivo | O quê |
|---|---|
| `index.html`, `js/`, `style.css` | o app (os 36 jogos e as telas) |
| `api/` | a API (TypeScript, Express, Sequelize/MySQL, como o E-CGU); rotas em `api/README.md` |
| `docker-compose.yml`, `Dockerfile`, `nginx.conf` | o MySQL, a API e o app (nginx) no Docker |
| `ferramentas/relatorio-email.gs` | o script do Google (hoje só o "carteiro" dos e-mails) |
| `docs/plano-sistema-com-login.md` | o plano das fases (1 a 4 prontas) |
