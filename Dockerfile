# Jogos Psicopedagógicos na VPS (Dokploy): nginx servindo os arquivos do app na raiz do domínio.
# No Dokploy: Build Type = Dockerfile, porta 80, domínio sem path (ex.: pedagociagamificada.com.br).
# As escolas abrem em /<escola> (ex.: /escolaExemplo) e os links antigos em /ortografia/ continuam funcionando.

# 1) a gestão (React, pasta gestao/) é compilada aqui e vira arquivos estáticos: na VPS não roda Node para ela
FROM node:20-alpine AS gestao
WORKDIR /gestao
COPY gestao/package.json gestao/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY gestao/ ./
RUN npm run build

# 2) o nginx serve o app dos jogos na raiz e a gestão compilada em /gestao/
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-seguranca.conf /etc/nginx/seguranca.conf
COPY . /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/nginx.conf /usr/share/nginx/html/nginx-seguranca.conf /usr/share/nginx/html/gestao
COPY --from=gestao /gestao/dist /usr/share/nginx/html/gestao
