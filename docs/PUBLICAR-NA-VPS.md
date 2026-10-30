# Publicar o sistema na VPS da Hostinger (Dokploy)

Passo a passo para pôr no ar o sistema com login (app + API + banco) em **https://gamespedagogicos.store**.
O código publicado é o da branch **`sistema-com-login`**.

---

## Como fica no servidor

```
navegador ──HTTPS──▶ Traefik (do Dokploy, portas 80/443, certificado Let's Encrypt)
                        │
                        ▼
                     web  (nginx: o app, /api → api, /<escola> → página da escola)
                        │
                        ▼
                     api  (Node/Express/TypeScript, porta 3333, só dentro do Docker)
                        │
                        ▼
                     mysql (MySQL 8, volume mysql_data, só dentro do Docker)
```

- Os 3 serviços estão no **`docker-compose.yml`** da raiz. O Dokploy sobe os três juntos.
- **Um domínio só:** o nginx do serviço `web` repassa `/api` para a API. **Não precisa** de `api.gamespedagogicos.store`.
  Com um endereço só, não há problema de CORS e o app já funciona como no computador.
- O **PostgreSQL** que aparece na VPS é **do próprio Dokploy**: não mexa nele. O banco do sistema é o **MySQL** do
  compose, separado.

> ⚠️ **Não rode o script de "instalação manual" do Dokploy** se o painel já está instalado (o PostgreSQL do Dokploy já
> aparece na VPS). O script faz `docker swarm leave --force` e recria a rede: isso derruba o Dokploy que já existe.
> Ele só serve para uma VPS **sem** Dokploy.

---

## 1. Domínio (DNS) — no painel da Hostinger

O DNS do `gamespedagogicos.store` fica na **Locaweb** (ns1.locaweb.com.br): os registros vão no painel da Locaweb,
não no da Hostinger. Crie (ou edite) os registros:

| Tipo | Nome | Aponta para | TTL |
|---|---|---|---|
| A | `@` | o IP da VPS | 300 |
| A | `www` | o IP da VPS | 300 |

O IP da VPS está em **VPS → Visão geral**. Apague outros registros **A** ou **AAAA** de `@` e `www` que apontem para
outro lugar (por exemplo, a hospedagem padrão da Hostinger). A propagação leva de minutos a algumas horas. Para conferir:

```bash
nslookup gamespedagogicos.store
```

---

## 2. Firewall da VPS (Hostinger → VPS → Firewall)

Deixe aberto só:

| Porta | Para quê |
|---|---|
| 22 | SSH (terminal) |
| 80 e 443 | o site (HTTP/HTTPS, pelo Traefik) |
| 3000 | o painel do Dokploy (feche depois de pôr o painel num domínio, se quiser) |

A porta **8089** (o `PORTA_WEB` do compose) só vale no próprio computador (`127.0.0.1`): na VPS, o site entra só pelo
domínio (Traefik, 80/443). Ela não pode ficar aberta para fora: direto no nginx, dá para inventar o IP no cabeçalho
`X-Forwarded-For` e driblar a trava de tentativas de login (o Traefik descarta esse cabeçalho falso).

**O painel do Dokploy (porta 3000) é HTTP, sem cadeado:** a senha do painel passa aberta pela rede. Depois que o
domínio funcionar, dê a ele um endereço com HTTPS (Dokploy → **Settings → Web Server → Domain**, por exemplo
`painel.gamespedagogicos.store`, com um registro A para o IP da VPS) e então **feche a porta 3000** no firewall.
Ligue também a verificação em duas etapas (2FA) da conta do Dokploy (**Settings → Profile**).

**SSH (porta 22):** prefira entrar com **chave SSH** (Hostinger → VPS → Chave SSH) em vez da senha do root.

---

## 3. Código no GitHub

O Dokploy baixa o código do GitHub. A branch **`sistema-com-login`** precisa estar enviada (`git push`).
Se o repositório for **privado**, ligue o GitHub ao Dokploy: **Settings → Git → GitHub → Create GitHub App** e
autorize o repositório `jogoOrtografia`.

---

## 4. Criar o app no Dokploy

Abra o painel: `http://IP-DA-VPS:3000`.

1. **Projects → Create Project**: nome `Jogos Pedagógicos`.
2. Dentro do projeto: **Create Service → Compose**.
   - Nome: `jogos`
   - Compose Type: **Docker Compose**
3. Na aba **General**:
   - Provider: **GitHub** → repositório `MarcoAurello/jogoOrtografia`
   - Branch: **`sistema-com-login`**
   - Compose Path: `./docker-compose.yml`
   - **Save**

---

## 5. Variáveis (aba **Environment**)

Cole as linhas abaixo e troque os valores. **Gere senhas novas para a produção:** não use as do `.env` do computador.
Para gerar um valor forte, rode no terminal do computador (Git Bash):

```bash
openssl rand -hex 32
```

```env
# banco (a senha do root do MySQL; só a API usa)
DB_NAME=games
DB_PASSWORD=<gere-uma-senha-forte>

# login (JWT) e o primeiro administrador (criado na 1ª subida; troque a senha depois de entrar)
JWT_SECRET=<gere-outro-valor-forte>
ADMIN_EMAIL=<seu-email-de-administrador>
ADMIN_SENHA=<senha-do-administrador>

# o endereço do sistema
FRONTEND_URL=https://gamespedagogicos.store

# e-mails dos relatórios: a própria API envia (sem a planilha)
EMAIL_VIA=smtp
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SEGURO=true
SMTP_USER=resend
SMTP_PASS=<a-chave-da-api-do-resend>
EMAIL_REMETENTE=Pedagogia Gamificada <nao-responda@gamespedagogicos.store>
```

**E-mail:**
- **Resend:** crie a conta em resend.com, adicione o domínio `gamespedagogicos.store` e crie no DNS da Hostinger os
  registros que ele pedir (TXT/MX). Só depois de o domínio aparecer como **Verified** os e-mails saem.
  O `EMAIL_REMETENTE` precisa usar esse mesmo domínio.
- **E-mail da Hostinger** (outra opção): `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`, `SMTP_SEGURO=true`,
  `SMTP_USER`/`SMTP_PASS` = a caixa de e-mail criada na Hostinger, e `EMAIL_REMETENTE` com esse mesmo e-mail.
- **Pela planilha do Google** (como antes): `EMAIL_VIA=planilha` e preencha `URL_PLANILHA` e `SENHA_PLANILHA`.

**Save** e depois **Deploy**.

---

## 6. Primeiro deploy

Na aba **Deployments**, abra o log. O build leva alguns minutos na primeira vez. Ele termina bem quando:

- o `mysql` fica **healthy**;
- o log do serviço `api` (aba **Logs**) mostra as migrações (`migrated`) e `Servidor rodando em http://localhost:3333`.

---

## 7. Domínio com HTTPS (aba **Domains**)

**Add Domain**:

| Campo | Valor |
|---|---|
| Service Name | `web` |
| Host | `gamespedagogicos.store` |
| Path | `/` |
| Container Port | `80` |
| HTTPS | ligado |
| Certificate | Let's Encrypt |

Repita com o host `www.gamespedagogicos.store`. Depois de salvar os domínios, faça **Deploy** de novo, para o Traefik
pegar as regras. O certificado sai sozinho em 1 ou 2 minutos, **se o DNS do passo 1 já estiver propagado**.

---

## 8. Conferir

**Antes do domínio (para testar já):** na aba **Domains**, use **Generate** (ou Add Domain com um host
`*.traefik.me` que o Dokploy sugere) para o serviço `web`, porta `80`. O Dokploy cria um endereço provisório que
aponta para o IP da VPS. Depois que o domínio de verdade funcionar, apague esse provisório.


| O quê | Como | Deve aparecer |
|---|---|---|
| API no ar | abra `https://gamespedagogicos.store/api/health` | `{"status":"ok"}` |
| App | abra `https://gamespedagogicos.store` | a tela inicial, com cadeado (HTTPS) |
| Administrador | ☰ → Área do professor → `ADMIN_EMAIL` / `ADMIN_SENHA` | o menu de administrador; troque a senha (🔑) |
| Escola | 🏫 Escolas → crie → **👁️ Abrir** | `https://gamespedagogicos.store/<escola>` com a marca dela |
| Teste completo | no computador: `python docs/testes/testar-fluxos.py https://gamespedagogicos.store` | **TUDO CERTO** |

O teste completo lê `ADMIN_EMAIL` e `ADMIN_SENHA` do `.env` **do computador**. Para rodar contra a VPS, ponha neles
os valores da produção (ou rode numa cópia da pasta). Ele cria uma escola de teste e a desativa no fim. A parte 8
procura o e-mail na caixa de teste do computador (mailpit): na VPS, ela falha. Confira o e-mail real no painel do Resend.

---

## 9. Backup do banco

Os dados ficam no volume **`mysql_data`**. Faça um destes:

- **Dokploy → o serviço → Volume Backups:** agende o backup do volume `mysql_data` (diário) para um destino S3
  (Settings → S3 Destinations; dá para usar o Backblaze B2 ou o Cloudflare R2, que são baratos).
- **Cópia manual** (terminal da VPS, por SSH):

```bash
docker exec $(docker ps -qf name=mysql) sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" games' > backup-games.sql
```

Guarde também uma cópia das **variáveis** (passo 5) num lugar seguro (gerenciador de senhas): sem o `DB_PASSWORD`,
o backup não abre.

---

## 10. Atualizar depois

1. No computador: commit e `git push` na branch `sistema-com-login`.
2. No Dokploy: **Deploy** (ou ligue o **Autodeploy**, aba General, para publicar a cada push).

As migrações novas rodam sozinhas quando a API sobe. Antes de atualizar, faça um backup (passo 9).

---

## Se der problema

| Sintoma | O que fazer |
|---|---|
| O certificado não sai / "não seguro" | O DNS ainda não aponta para a VPS (`nslookup`). Espere propagar e faça **Deploy** de novo |
| `404 page not found` (do Traefik) | Falta o domínio na aba **Domains** (serviço `web`, porta `80`), ou o deploy depois de adicionar o domínio |
| `502 Bad Gateway` em `/api` | A API não subiu: aba **Logs** → `api`. Em geral é variável faltando (`JWT_SECRET`, `DB_PASSWORD`) |
| A API não conecta no banco | O `DB_PASSWORD` mudou depois que o volume foi criado: o MySQL guarda a senha da 1ª subida. Volte a senha antiga |
| E-mails não chegam | Aba **Logs** → `api` ("Erro ao enviar…"); no Resend, o domínio precisa estar **Verified** |
| O app parece "velho" | O navegador guardou a versão anterior: abra numa janela anônima. Ao publicar, suba a versão (`ferramentas/versao.ps1`) |
