# Plano: Família (responsável) e aluno cadastrado

Objetivo: o pai/mãe (responsável) ganha login próprio para acompanhar os jogos e o
progresso dos filhos, e as psicopedagogas acompanham o mesmo aluno. Combinado com o
Marco em 06/11/2026.

Fora deste plano: quiz gerado por IA (será pago, fica para depois).

## Requisitos combinados

1. **Aluno avulso continua igual**: código da turma + nome, entra e participa das
   competições da turma. Nada muda para ele.
2. **Aluno cadastrado**: tem ficha, responsável(is) vinculado(s) e um **PIN de 4 números** (decisão do Marco: "troque
   as figuras pelo cadastro de um pin"). O responsável digita duas vezes; no banco fica só o hash (bcrypt); PINs
   fáceis (0000, 1234) são recusados; o responsável pode trocar depois. A senha de figuras nunca foi usada por aluno
   nenhum (a entrada sempre foi só código + nome): `alunos.senha_figuras` continua só preenchida, sem uso.
3. **Mesma porta de entrada** (código da turma → nome):
   - avulso → entra direto;
   - cadastrado → pede o PIN (teclado numérico grande) → entra ligado à ficha. 5 erros travam por 5 minutos
     (`tentativas`/`bloqueado_ate`); trocar o PIN destrava. Feito no app (`js/entrada.js`) junto com a fase 2.
   - Para o ranking/competição os dois são iguais.
   - Cadastrado tem uma entrada a mais: em casa, pela conta do responsável
     ("Quem vai jogar?" → PIN), sem código de turma.
   - Um avulso vira cadastrado quando o responsável se cadastra (a ligação de um avulso que já existe a uma ficha
     nova fica para depois: o convite por aluno foi tirado a pedido do Marco).
4. **Responsável**: novo perfil `responsavel` (mesma tabela `usuarios`, mesmo login/JWT).
   - N:N: um responsável com vários filhos; um filho com vários responsáveis (hoje só o lado "vários filhos" tem
     caminho na tela: a página de cadastro sempre cria filhos novos).
5. **Dois caminhos de vínculo**:
   - **Página de cadastro da escola/psicopedagoga** (decisão do Marco, 06/11: "bastava uma página de cadastro já
     vinculada à escola"): endereço fixo, sem token — a escola usa `/<escola>/cadastro` e o professor avulso
     `/cadastro/<apelido>` (apelido único gerado do nome, ex.: ana-souza). Uma chave só, "Aceitar cadastros de
     famílias" (começa desligada; desligada, a página avisa que o cadastro não está aberto). O responsável
     preenche nome, e-mail, senha, aceita a LGPD e cadastra 1+ filhos (nome, nascimento e o PIN de 4 números). Na escola os filhos nascem sem turma ("aguardando turma"; a coordenação
     coloca na turma); no professor avulso, como pacientes dele (`alunos.professor_id`). A visibilidade segue as
     chaves do dono da página. Quem já tem conta usa o mesmo e-mail e senha e os filhos novos entram nela.
     Grátis para a família. (O convite por aluno com token foi feito e tirado no mesmo dia.)
   - **Compra avulsa**: o pai assina por conta própria para o filho aprender em casa
     (aluno sem escola). Cobrança definida na fase 5; até lá o admin libera à mão.
6. **Psicopedagoga = professor avulso atual**; pacientes = alunos cadastrados sem turma.
   O pai de compra avulsa pode gerar um **código de compartilhamento** (revogável) para
   ligar o filho a uma psicopedagoga.
7. **O que o responsável pode ver**: jogos e desempenho, recados para a família, plano
   de objetivos, anamnese. **Nunca** observações internas nem outros alunos.
   Edita só a anamnese e os dados cadastrais do próprio filho.
8. **A escola escolhe o que mostrar** (liga/desliga por relatório):

   | Relatório | Padrão |
   |---|---|
   | Jogos e desempenho | ligado |
   | Recados para a família | ligado |
   | Plano de objetivos | desligado |
   | Anamnese (pareceres da equipe) | desligado |

   - Exceção por aluno na ficha (sobrepõe a regra da escola).
   - Psicopedagoga avulsa tem as mesmas chaves para os pacientes dela.
   - Compra avulsa (filho sem escola e sem psicopedagoga): joga em casa e o pai vê desempenho, relatórios,
     recados e plano, mas **não tem anamnese** (nem criar, nem ver, nem a página da anamnese). Se depois for
     ligado a uma psicopedagoga (compartilhamento, fase 5), a anamnese passa a existir pelas regras dela.
     (Na API: `alunoTemDono` e `familiaPodeVer` em `acessoAluno.ts`; a compra/cobrança fica para a fase 5.)
   - Aluno em escola e com psicopedagoga: cada uma controla o que ela produziu.
   - O pai **sempre** vê as respostas que ele mesmo preencheu na anamnese.
   - Relatório desligado **some** da tela do pai (sem "bloqueado").
   - Conferido **na API** (não só esconder na tela).

## Desenho técnico

**Banco (migrações novas, nunca editar as que já rodaram)**
- `usuarios.perfil`: acrescentar `responsavel`.
- `responsavel_alunos`: responsavel_id, aluno_id, parentesco, origem
  (`pagina_cadastro` | `cadastro_proprio` | `compartilhamento`), consentimento_em, created_at.
- `recados_familia`: aluno_id, autor_id, texto, created_at (separado de `observacoes`
  para nada interno vazar por engano).
- `escolas.visivel_familia` (JSON) e o equivalente para o professor avulso;
  `alunos.visivel_familia` (JSON, opcional) para a exceção por aluno.
- `partidas.local`: `escola` | `casa`.
- `escolas.aceita_cadastro_familia` e `usuarios.aceita_cadastro_familia` (a chave), `usuarios.apelido` (o endereço do
  professor avulso), `alunos.professor_id` (paciente sem turma do professor avulso) e `alunos.cadastro_origem`
  (`familia`). Tudo numa migração só: `20261106100000-familia-responsavel.js`.

**Permissões** — tudo em `api/src/services/acessoAluno.ts`:
- `podeVerAluno` / `podeEditarAluno` passam a considerar o responsável vinculado.
- `familiaPodeVer(aluno, relatorio)` aplica escola → exceção do aluno → regras acima.

**Telas**
- Gestão: menu **Família** (o endereço fixo da página de cadastro com Copiar / WhatsApp / QR code, a chave "Aceitar
  cadastros de famílias" e as chaves do que a família vê); aba **Família** na página do aluno (responsáveis ligados,
  recados, exceção do que a família vê); "Aguardando turma" na lista de alunos.
- Página pública de cadastro: `cadastro.html` + `js/cadastro-familia.js` (no padrão do `anamnese.html`), servida pelo
  nginx em `/<escola>/cadastro` e `/cadastro/<apelido>`.
- Família: área `/familia` no `gestao/` (React), simples e pensada para o celular:
  filhos, desempenho por jogo, recados, plano, anamnese.
- App dos jogos: PIN para o cadastrado na entrada pela turma;
  "Quem vai jogar?" na entrada pela conta do responsável (fase 4).

## Fases (uma sessão por fase)

1. **Banco + perfil responsável + consentimento + visibilidade + permissões** (API) — com os cenários novos em
   `docs/testes/testar-fluxos.py` (TUDO CERTO). Feito em 06/11/2026.
2. **Gestão + página de cadastro**: menu Família, aba Família do aluno, recados, chaves de visibilidade, "aguardando
   turma" e a página pública de cadastro (`/<escola>/cadastro`, `/cadastro/<apelido>`). Feito em 06/11/2026.
3. **Área da família** (`/gestao/familia`, React): o responsável entra com o login normal, cai direto na área dele
   (sem o menu da gestão) e vê os filhos; em cada filho, abas só com o que a API libera (jogos e desempenho, recados,
   plano, anamnese; desligado some; compra avulsa sem anamnese). "Alterar a minha senha" no menu da conta e
   "Trocar PIN" em cada filho (teclado numérico grande, PIN digitado duas vezes). Ao terminar o cadastro, a página
   pública já entra na conta e tem o botão "Acompanhar meus filhos". A escola também (aba Família da página do
   aluno): "Redefinir PIN" (coordenação, admin, professor das turmas do aluno, psicopedagoga dona do paciente) e senha
   provisória para o responsável (coordenação, admin, psicopedagoga; ele cria a própria no próximo acesso).
   Feito em 06/11/2026.
4. **Entrada do aluno cadastrado em casa**: "Quem vai jogar?" pela conta do responsável → PIN (a entrada pela turma
   com PIN já foi feita na fase 2; a troca do PIN, na fase 3). Feito em 06/11/2026:
   - Área da família: botão "🎮 Jogar (Quem vai jogar?)" e "🎮 Jogar" em cada filho → o app abre em `/?casa` (ou
     `/?casa=<id>`, direto no PIN). No app também há "🏠 Jogar em casa" no início e no menu ☰. É a mesma tela da entrada
     pela turma (`js/entrada.js`): cartões grandes com os filhos e o mesmo teclado do PIN; filho sem PIN aparece apagado.
   - API: `POST /familia/filhos/:id/entrar` (o mesmo bloqueio de 5 erros/5 minutos). As partidas de casa ficam com
     `local = 'casa'` (vem do token) e com a turma de agora do aluno; sem turma, `turma_id` vazio (migração
     `20261106130000-jogar-em-casa.js`). A escola e a psicopedagoga veem na ficha como as outras.
   - **Lembrar o login** (pedido do Marco): o app guarda o token do aluno (nunca o PIN). No início aparece
     "Continuar como <nome>" e "Não sou eu / trocar de aluno". Pela turma: até o fim do dia (o tablet da escola é
     dividido; o token continua de 12 h). Em casa: 30 dias (token de 30 dias). O avulso (sem PIN) continua perdendo o
     login ao voltar ao início. Trocar o PIN (família ou escola) derruba os logins lembrados: `alunos.sessao_versao` vai
     no token e sobe 1 a cada troca. "Trocar aluno" no menu também esquece.
   - **Código da família** (ajuste aprovado pelo Marco): o filho joga no aparelho DELE sem a conta do pai. Cada
     responsável tem um código `FAM-XXXXX` (`usuarios.codigo_familia`, migração `20261106140000-codigo-da-familia.js`),
     na área da família com Copiar/WhatsApp e "Gerar outro código" (o antigo para de valer e os aparelhos que entraram
     com ele caem: o token do aluno leva o código). No app, "🏠 Jogar em casa" pede o código só na primeira vez; o
     aparelho guarda o código (nunca o PIN nem a conta) e daí é tocar no nome e digitar o PIN. Pelo código só aparece o
     apelido dos filhos. Limite de 20 erros por minuto por IP nas rotas `/familia-codigo`, além do bloqueio do PIN.
     O "🎮 Jogar" pela conta do pai na área da família continua igual.
5. **Compra avulsa + código de compartilhamento com a psicopedagoga** (definir cobrança antes).

## Pendências de decisão

- Cobrança da compra avulsa: gateway, valor, mensal/anual (antes da fase 5).
- "Esqueci a senha": não existe para nenhum perfil (só a coordenação/admin define senha provisória para a equipe).
  O responsável não tem quem redefina a senha dele: falta um "esqueci a senha" por e-mail.
- Fase 5 (Mercado Pago): planos mensal/anual/os dois, valor de cada um e teste grátis para a família.
- Quiz por IA (pago): quando fazer e quanto cobrar.
- Riscos de segurança conhecidos (detalhes em "Para depois"): senha do responsável entre donos diferentes e
  bloqueio do PIN não atômico — decidir quando corrigir.

## Para depois

- Recuperar senha sozinho pela tela de login: o responsável pede e recebe o link por e-mail
  (hoje a escola/psicopedagoga redefine na gestão).
- **Fase 5 — compra avulsa com o Mercado Pago** (o Marco já tem conta; não usar PagSeguro):
  assinatura (mensal, cobrança recorrente no cartão) e/ou pagamento único (anual, Checkout Pro com Pix/cartão/boleto);
  liberar o acesso só depois de confirmar o pagamento direto na API do Mercado Pago (webhook com assinatura conferida);
  tabela de assinaturas (responsável, plano, situação, válida até); testar no ambiente de testes do Mercado Pago.
  Decidir antes: planos (mensal/anual/os dois), valor de cada um, teste grátis para a família (ex.: 7 dias).
  Junto: código de compartilhamento do filho com a psicopedagoga.
- **Quiz gerado por IA a partir de PDF/foto** (pago): estudo feito em 06/11/2026 — professor envia PDF ou foto,
  a API manda ao Claude, volta o quiz em JSON, o professor revisa e salva; jogo genérico "Quiz da Turma".
- **Riscos de segurança conhecidos** (security-review de 06/11/2026; o Marco decidiu não tratar agora):
  - Redefinir a senha do responsável troca a conta inteira: se o pai tiver filhos com donos diferentes (escola A e
    psicopedagoga/escola B), a equipe de um dono consegue entrar na conta e ver o filho do outro. Some com o
    "esqueci a senha" por e-mail (a equipe deixa de definir a senha do pai) e exigindo `primeiro_login` no servidor.
  - Bloqueio do PIN do aluno não é atômico (`SessionController`): tentativas em paralelo quase não sobem o contador.
    Corrigir com incremento atômico e bloqueio que aumenta a cada rodada.
