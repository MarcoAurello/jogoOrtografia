# API dos Jogos Psicopedagógicos. Construída a partir da raiz do repositório (docker-compose: context ".",
# dockerfile api/Dockerfile), porque a página de cada escola usa o index.html do app.
FROM node:20-alpine

# Fuso de Brasília no processo Node: sem isso o container roda em UTC e as datas (fim do teste grátis,
# último acesso) saem deslocadas.
RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

WORKDIR /app

COPY api/package*.json ./
RUN npm ci

COPY api/ .
RUN npm run build

# o index.html do app, para a página das escolas sair com a marca delas
COPY index.html ./publico/index.html
ENV ARQUIVO_INDEX=/app/publico/index.html

ENV NODE_ENV=production
EXPOSE 3333

# cria/atualiza as tabelas e o administrador inicial antes de subir (os dois não repetem o que já existe)
CMD ["sh", "-c", "npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && node dist/server.js"]
