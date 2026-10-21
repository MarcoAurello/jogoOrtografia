# Jogo de Ortografia na VPS (Dokploy): nginx servindo os arquivos do jogo em /ortografia/
# No Dokploy: Build Type = Dockerfile, domínio com path /ortografia e "Strip Path" DESLIGADO, porta 80.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/ortografia
