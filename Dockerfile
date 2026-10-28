# Jogos Psicopedagógicos na VPS (Dokploy): nginx servindo os arquivos do app na raiz do domínio.
# No Dokploy: Build Type = Dockerfile, porta 80, domínio sem path (ex.: pedagociagamificada.com.br).
# As escolas abrem em /<escola> (ex.: /escolaExemplo) e os links antigos em /ortografia/ continuam funcionando.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
RUN rm -f /usr/share/nginx/html/nginx.conf
