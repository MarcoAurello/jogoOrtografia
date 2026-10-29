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
| 3. Turma e alunos | código da turma, alunos com figuras, nome repetido, figuras erradas, token de aluno isolado |
| 4. Partidas, painel e ficha | 10 partidas em 5 semanas, fila sem duplicar, painel da turma, ficha (evolução, antes × depois, o que revisar), trava de 5 erros |
| 5. Questionário e competição | questionário da escola, competição com código, isolamento entre escolas, ranking (melhor partida), encerramento |
| 6. Testar grátis | aceite da LGPD, cadastro, lista do administrador |
| 7. Bloqueio | teste grátis vencido bloqueia professores e alunos; ativar o plano desbloqueia |
| 8. Carteiro | o script do Google está na versão 6 (manda os relatórios por e-mail) |

Para testar outro endereço: `python docs/testes/testar-fluxos.py http://localhost:8090`.

---

## 2. Teste à mão

**As contas:** o administrador é o do `.env`. Entrando como administrador, você cria a escola, a coordenação e os
professores (👥 Usuários), e o professor cria a turma e os alunos (🏫 Turmas e alunos), com o código da turma e as figuras
de cada aluno. Se trouxe o banco de outra máquina (arquivo `.sql`), as contas de lá continuam valendo.

Dica: se o app parecer "velho" depois de uma mudança, use uma **janela anônima**.

| # | Fluxo | Como testar | Deve acontecer |
|---|---|---|---|
| 1 | **Aluno entra e depois entra na turma** | Tela inicial: digite só o nome → no início, **🏫 Entrar com o código da turma** → código → toque no nome → as 3 figuras | Volta ao início com o nome da turma no botão ("🏫 Turma … ✔"); as partidas passam a ficar guardadas |
| 1b | Figuras erradas | Erre as figuras 5 vezes seguidas | "Muitas tentativas": o aluno fica travado 1 minuto |
| 2 | **Partida no banco** | Com o aluno da turma, jogue um jogo até o fim | No professor: 🏫 Turmas e alunos → a turma → a partida em "🎮 Últimas partidas" |
| 2b | Sem internet | Jogue com a internet desligada e religue | A partida aparece para o professor quando a internet volta |
| 3 | **Painel e ficha** | Professor → a turma → **📊 Painel da turma** → período → toque num aluno → **📄 Baixar PDF** | Números da turma, maiores dificuldades, gráficos; na ficha: evolução, radar, antes × depois, o que revisar; o PDF baixa |
| 4 | **Turma nova** | Professor → 🏫 Turmas e alunos → crie a turma → cole nomes (um por linha) | Código da turma e as figuras de cada aluno; nome repetido é avisado |
| 5 | **Usuários** | Coordenação → 👥 Usuários → cadastre um professor com senha provisória → Sair → entre com ele | O app pede para criar a senha; o professor vê só as turmas dele |
| 6 | **Escola nova** | Administrador → 🏫 Escolas → crie com logo e cores → 👁️ Abrir | A página `/escola` abre direto com o logo, as cores e o nome |
| 6b | Teste grátis vencido | Na lista de escolas, uma com "🔒 teste acabou" → abra a página dela | Aviso "acesso pausado" com o WhatsApp; ✅ Ativar plano ou ⏳ +14 dias desbloqueia |
| 6c | Importar da planilha | Administrador → 🏫 Escolas → 📥 Importar da planilha | Escolas, e-mails, questionários e competições da planilha; tocar de novo não repete nada |
| 7 | **Questionário** | Aba **Questionário** | A lista de questionários (da plataforma ou da escola do endereço); responder até o fim |
| 8 | **Competição** | Professor → 🏆 Competições → crie (anote o código) → no endereço da escola do professor (`/escola`), aba 🏆 Competição → entre com o código → jogue | O aluno da turma entra com o próprio nome; a pontuação aparece no ranking; depois de encerrar, ninguém entra |
| 9 | **Testar grátis** | Início → 🎮 Teste grátis → cadastre **o seu e-mail** → jogue até o fim | O relatório em PDF chega no e-mail (pelo Gmail da planilha). Para não mandar de verdade: `EMAIL_VIA=smtp` com a caixa de teste (http://localhost:8025) |
| 10 | **Relatório para o professor** | Antes de jogar, escolha um professor em "Para quem vai o relatório" | O e-mail chega (precisa do **script versão 6** implantado na planilha) |
| 11 | **Administrador: testes grátis** | Administrador → 🎁 Testes grátis | Quem se cadastrou, quantos relatórios recebeu, copiar os e-mails |
