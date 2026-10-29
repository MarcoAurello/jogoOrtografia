# Roteiro de testes do sistema com login e banco

Dois jeitos de testar, com o sistema no ar no localhost (`docker compose up -d`, veja `docs/COMO-RODAR-EM-OUTRA-MAQUINA.md`):

1. **Automático** (2 minutos): um script testa todos os fluxos pela API.
2. **À mão** (no navegador): os mesmos fluxos, tela por tela.

---

## 1. Teste automático

Na pasta do projeto (precisa só do Python 3, sem pacotes extras):

```bash
python docs/testes/testar-fluxos.py
```

Ele não depende de contas de teste: com o **administrador do `.env`** (`ADMIN_EMAIL` / `ADMIN_SENHA`), cria uma escola nova
(`/testeXXXXXX`), a coordenação, uma professora, uma turma e os alunos, e testa dentro dessa escola (não mexe nos dados que
já existem). No fim, a escola de teste fica **desativada**. Termina com **TUDO CERTO** ou com a lista do que falhou.

O que ele confere:

| Parte | O que testa |
|---|---|
| 1. Administrador e escola | login, escola nova com 14 dias de teste, página da escola com a marca, endereço repetido/reservado |
| 2. Coordenação e professor | cadastro com senha provisória, 1º acesso com troca de senha, permissões de cada perfil |
| 3. Turma e alunos | código da turma, aluno entra tocando no nome ou digitando (nome novo entra na turma), mesmo nome = mesmo aluno, token de aluno isolado |
| 4. Partidas, painel e ficha | 10 partidas em 5 semanas, fila sem duplicar, painel da turma, ficha (evolução, antes × depois, o que revisar), trava de 5 erros |
| 5. Questionário e competição | questionário da escola, competição com código, isolamento entre escolas, ranking (melhor partida), encerramento |
| 6. Testar grátis | aceite da LGPD, cadastro, lista do administrador |
| 7. Bloqueio | teste grátis vencido bloqueia professores e alunos; ativar o plano desbloqueia |
| 8. E-mail dos relatórios | com `EMAIL_VIA=smtp`: a API envia um relatório e ele chega na caixa de teste (mailpit) com o conteúdo certo; com `EMAIL_VIA=planilha`: o script do Google está na versão 6 |

Para testar outro endereço: `python docs/testes/testar-fluxos.py http://localhost:8090`.

---

## 2. Teste à mão

**As contas:** o administrador é o do `.env`. Entrando como administrador, você cria a escola, a coordenação e os
professores (👥 Usuários) ou professores avulsos (sem escola), e pode **🚪 Entrar na escola** (🏫 Escolas) para fazer tudo
como a coordenação dela. O professor cria a turma (🏫 Turmas e alunos) e, se quiser, cadastra os alunos: também dá para só
passar o código da turma, e cada aluno digita o nome ao entrar (sem senha). Se trouxe o banco de outra máquina (arquivo `.sql`), as contas de lá continuam valendo.

Dica: se o app parecer "velho" depois de uma mudança, use uma **janela anônima**.

| # | Fluxo | Como testar | Deve acontecer |
|---|---|---|---|
| 1 | **Aluno entra na turma** | Tela inicial: digite só o nome → **🏫 Entrar com o código da turma** → código → toque no nome (ou digite) | Abre a aba 🏆 Competição com as competições daquela turma; as partidas passam a ficar guardadas |
| 1b | Voltar ao início | Com o aluno na turma, toque em Início | O login da turma sai: para ver as competições, é o código de novo |
| 1c | Jogo pelo link | Abra um link de jogo (`?jogo=...`) | Entra direto no jogo, sem código de turma |
| 2 | **Partida no banco** | Com o aluno da turma, jogue um jogo até o fim | No professor: 🏫 Turmas e alunos → a turma → a partida em "🎮 Últimas partidas" |
| 2b | Sem internet | Jogue com a internet desligada e religue | A partida aparece para o professor quando a internet volta |
| 3 | **Painel e ficha** | Professor → a turma → **📊 Painel da turma** → período → toque num aluno → **📄 Baixar PDF** | Números da turma, maiores dificuldades, gráficos; na ficha: evolução, radar, antes × depois, o que revisar; o PDF baixa |
| 4 | **Turma nova** | Professor → 🏫 Turmas e alunos → crie a turma → cole nomes (um por linha), se quiser | Código da turma e a lista de alunos; nome repetido é avisado; quem digita um nome novo ao entrar aparece na lista |
| 5 | **Usuários** | Coordenação → 👥 Usuários → cadastre um professor com senha provisória → Sair → entre com ele | O app pede para criar a senha; o professor vê só as turmas dele |
| 6 | **Escola nova** | Administrador → 🏫 Escolas → crie com logo e cores → 👁️ Abrir | A página `/escola` abre direto com o logo, as cores e o nome |
| 6d | Administrador na escola | Administrador → 🏫 Escolas → **🚪 Entrar na escola** → crie turma, professor, competição → **⬅ Sair da escola** | Dentro, o menu é o da coordenação daquela escola; ao sair, volta o menu de administrador |
| 6b | Teste grátis vencido | Na lista de escolas, uma com "🔒 teste acabou" → abra a página dela | Aviso "acesso pausado" com o WhatsApp; ✅ Ativar plano ou ⏳ +14 dias desbloqueia |
| 6c | Importar da planilha | Administrador → 🏫 Escolas → 📥 Importar da planilha | Escolas, e-mails, questionários e competições da planilha; tocar de novo não repete nada |
| 7 | **Questionário** | Aba **Questionário** | A lista de questionários (da plataforma ou da escola do endereço); responder até o fim |
| 8 | **Competição** | Professor → 🏆 Competições → escolha a **turma** e o jogo → crie → aluno: código da turma → nome → **Jogar ▶** (jogue 2 vezes) | A competição aparece só para quem entrou com o código daquela turma; no ranking vale a maior nota; todas as partidas aparecem para o professor; depois de encerrar, ninguém joga |
| 9 | **Testar grátis** | Início → 🎮 Teste grátis → cadastre **o seu e-mail** → jogue até o fim | O relatório em PDF chega no e-mail (pelo Gmail da planilha). Para não mandar de verdade: `EMAIL_VIA=smtp` com a caixa de teste (http://localhost:8025) |
| 10 | **Relatório para o professor** | Antes de jogar, escolha um professor em "Para quem vai o relatório" | O e-mail chega (com `EMAIL_VIA=smtp`, na caixa de teste http://localhost:8025; com `planilha`, precisa do **script versão 6**) |
| 11 | **Administrador: testes grátis** | Administrador → 🎁 Testes grátis | Quem se cadastrou, quantos relatórios recebeu, copiar os e-mails |
