/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Perguntas do Jogo dos Gráficos: o enunciado curto, o nível, o tipo de gráfico e os dados certos. */

// nivel: 1 fácil · 2 médio · 3 difícil
// tipo: 'colunas' (barras em pé), 'barras' (deitadas), 'linha' (evolução no tempo) ou 'pizza' (partes de um todo, em %)
// rotulos: as categorias (curtas, para caber no gráfico); valores: os números certos; eixo: o que a escala mede.
// Os gráficos errados são criados pelo jogo a partir destes dados (valores trocados, um valor errado, ordem invertida...).
const PERGUNTAS_GRAFICOS = [
  // ---------- Fácil: números pequenos, poucas categorias ----------
  { nivel: 1, tipo: 'colunas', texto: 'Luiz vendeu 3 carros, Lucas 2 e Ana 7.', rotulos: ['Luiz', 'Lucas', 'Ana'], valores: [3, 2, 7], eixo: 'Carros vendidos' },
  { nivel: 1, tipo: 'barras', texto: 'Sofia leu 8 livros, Pedro 5 e Tiago 3.', rotulos: ['Sofia', 'Pedro', 'Tiago'], valores: [8, 5, 3], eixo: 'Livros lidos' },
  { nivel: 1, tipo: 'colunas', texto: 'Matemática teve 18 votos, Português 12 e Ciências 15.', rotulos: ['Matemática', 'Português', 'Ciências'], valores: [18, 12, 15], eixo: 'Votos' },
  { nivel: 1, tipo: 'barras', texto: 'O Brasil ganhou 12 medalhas, os EUA 18 e o Japão 10.', rotulos: ['Brasil', 'EUA', 'Japão'], valores: [12, 18, 10], eixo: 'Medalhas' },
  { nivel: 1, tipo: 'colunas', texto: 'No estacionamento há 15 carros brancos, 8 pretos e 5 vermelhos.', rotulos: ['Brancos', 'Pretos', 'Vermelhos'], valores: [15, 8, 5], eixo: 'Carros' },
  { nivel: 1, tipo: 'barras', texto: 'O pediatra atendeu 14 pessoas, o clínico 22 e o dentista 10.', rotulos: ['Pediatra', 'Clínico', 'Dentista'], valores: [14, 22, 10], eixo: 'Atendimentos' },
  { nivel: 1, tipo: 'colunas', texto: 'O abrigo recebeu 15 cães, 10 gatos e 5 coelhos.', rotulos: ['Cães', 'Gatos', 'Coelhos'], valores: [15, 10, 5], eixo: 'Animais' },
  { nivel: 1, tipo: 'barras', texto: 'Clara tem 9 figurinhas, Gabriel 4 e Rafael 6.', rotulos: ['Clara', 'Gabriel', 'Rafael'], valores: [9, 4, 6], eixo: 'Figurinhas' },
  { nivel: 1, tipo: 'colunas', texto: 'Na feira, Ana vendeu 6 bolos, Bia 9 e Caio 3.', rotulos: ['Ana', 'Bia', 'Caio'], valores: [6, 9, 3], eixo: 'Bolos vendidos' },
  { nivel: 1, tipo: 'barras', texto: 'No recreio, 12 alunos jogaram bola, 7 pularam corda e 5 leram.', rotulos: ['Bola', 'Corda', 'Leitura'], valores: [12, 7, 5], eixo: 'Alunos' },
  { nivel: 1, tipo: 'colunas', texto: 'Choveu 3 dias em março, 7 em abril e 5 em maio.', rotulos: ['Março', 'Abril', 'Maio'], valores: [3, 7, 5], eixo: 'Dias de chuva' },
  { nivel: 1, tipo: 'pizza', texto: 'Do bolo, 50% era de chocolate, 25% de morango e 25% de baunilha.', rotulos: ['Chocolate', 'Morango', 'Baunilha'], valores: [50, 25, 25] },
  { nivel: 1, tipo: 'pizza', texto: 'A Terra tem 70% de água e 30% de terra firme.', rotulos: ['Água', 'Terra firme'], valores: [70, 30] },
  { nivel: 1, tipo: 'pizza', texto: 'O Candidato A teve 60% dos votos, o B 30% e 10% foram nulos.', rotulos: ['Candidato A', 'Candidato B', 'Nulos'], valores: [60, 30, 10] },
  { nivel: 1, tipo: 'pizza', texto: '50% dos alunos vão de ônibus, 25% a pé e 25% de carro.', rotulos: ['Ônibus', 'A pé', 'Carro'], valores: [50, 25, 25] },
  { nivel: 1, tipo: 'pizza', texto: 'O Sócio 1 tem 50% da empresa, o Sócio 2 tem 30% e o Sócio 3, 20%.', rotulos: ['Sócio 1', 'Sócio 2', 'Sócio 3'], valores: [50, 30, 20] },

  // ---------- Médio: dezenas, 4 categorias, e entra o gráfico de linha ----------
  { nivel: 2, tipo: 'colunas', texto: 'A Turma A juntou 45 brinquedos, a B 60 e a C 30.', rotulos: ['Turma A', 'Turma B', 'Turma C'], valores: [45, 60, 30], eixo: 'Brinquedos' },
  { nivel: 2, tipo: 'barras', texto: 'A cantina vendeu 40 picolés de morango, 65 de chocolate, 20 de limão e 35 de uva.', rotulos: ['Morango', 'Chocolate', 'Limão', 'Uva'], valores: [40, 65, 20, 35], eixo: 'Picolés' },
  { nivel: 2, tipo: 'colunas', texto: 'A horta colheu 50 kg de tomate, 35 de cenoura, 20 de alface e 40 de batata.', rotulos: ['Tomate', 'Cenoura', 'Alface', 'Batata'], valores: [50, 35, 20, 40], eixo: 'Quilos (kg)' },
  { nivel: 2, tipo: 'barras', texto: 'A pizzaria vendeu 45 pizzas de calabresa, 30 de frango, 25 de queijo e 15 de legumes.', rotulos: ['Calabresa', 'Frango', 'Queijo', 'Legumes'], valores: [45, 30, 25, 15], eixo: 'Pizzas' },
  { nivel: 2, tipo: 'colunas', texto: 'A biblioteca emprestou 40 livros de aventura, 25 gibis, 15 de mistério e 10 de poesia.', rotulos: ['Aventura', 'Gibis', 'Mistério', 'Poesia'], valores: [40, 25, 15, 10], eixo: 'Livros' },
  { nivel: 2, tipo: 'barras', texto: 'O bairro Norte juntou 80 kg de plástico, o Sul 110 e o Centro 95.', rotulos: ['Norte', 'Sul', 'Centro'], valores: [80, 110, 95], eixo: 'Plástico (kg)' },
  { nivel: 2, tipo: 'linha', texto: 'Um pé de feijão mediu 2, 6, 12 e 20 cm nas semanas 1 a 4.', rotulos: ['1ª sem.', '2ª sem.', '3ª sem.', '4ª sem.'], valores: [2, 6, 12, 20], eixo: 'Altura (cm)' },
  { nivel: 2, tipo: 'linha', texto: 'O cachorrinho pesou 2, 4, 7 e 9 kg nos meses 1 a 4.', rotulos: ['1º mês', '2º mês', '3º mês', '4º mês'], valores: [2, 4, 7, 9], eixo: 'Peso (kg)' },
  { nivel: 2, tipo: 'linha', texto: 'A temperatura foi 15 °C às 8h, 22 °C às 12h, 25 °C às 15h e 18 °C às 20h.', rotulos: ['8h', '12h', '15h', '20h'], valores: [15, 22, 25, 18], eixo: 'Temperatura (°C)' },
  { nivel: 2, tipo: 'linha', texto: 'O cofrinho tinha R$ 20 em janeiro, R$ 45 em fevereiro, R$ 40 em março e R$ 80 em abril.', rotulos: ['Jan', 'Fev', 'Mar', 'Abr'], valores: [20, 45, 40, 80], eixo: 'Dinheiro (R$)' },
  { nivel: 2, tipo: 'linha', texto: 'O quilo do tomate custou R$ 5, R$ 7, R$ 6 e R$ 9 de janeiro a abril.', rotulos: ['Jan', 'Fev', 'Mar', 'Abr'], valores: [5, 7, 6, 9], eixo: 'Preço do quilo (R$)' },
  { nivel: 2, tipo: 'linha', texto: 'O chá esfriou: 80 °C, 60 °C, 45 °C e 30 °C, a cada 5 minutos.', rotulos: ['0 min', '5 min', '10 min', '15 min'], valores: [80, 60, 45, 30], eixo: 'Temperatura (°C)' },
  { nivel: 2, tipo: 'pizza', texto: 'O dinheiro da família: 40% moradia, 30% comida, 20% transporte e 10% lazer.', rotulos: ['Moradia', 'Comida', 'Transporte', 'Lazer'], valores: [40, 30, 20, 10] },
  { nivel: 2, tipo: 'pizza', texto: 'O lixo da praia: 60% plástico, 20% papel, 10% vidro e 10% metal.', rotulos: ['Plástico', 'Papel', 'Vidro', 'Metal'], valores: [60, 20, 10, 10] },
  { nivel: 2, tipo: 'pizza', texto: 'Bruno usa o celular: 40% redes sociais, 30% jogos, 20% vídeos e 10% estudos.', rotulos: ['Redes sociais', 'Jogos', 'Vídeos', 'Estudos'], valores: [40, 30, 20, 10] },
  { nivel: 2, tipo: 'pizza', texto: 'Na loja, 50% pagaram com cartão, 35% com PIX e 15% em dinheiro.', rotulos: ['Cartão', 'PIX', 'Dinheiro'], valores: [50, 35, 15] },
  { nivel: 2, tipo: 'pizza', texto: 'A reciclagem juntou 50% de papel, 30% de plástico e 20% de metal.', rotulos: ['Papel', 'Plástico', 'Metal'], valores: [50, 30, 20] },

  // ---------- Difícil: centenas e milhares, decimais, mais pontos e diferenças pequenas ----------
  { nivel: 3, tipo: 'colunas', texto: 'A Equipe Alfa fez 450 pontos, a Beta 380 e a Gama 510.', rotulos: ['Alfa', 'Beta', 'Gama'], valores: [450, 380, 510], eixo: 'Pontos' },
  { nivel: 3, tipo: 'barras', texto: 'Foram vendidos 120 ingressos na sexta, 200 no sábado e 150 no domingo.', rotulos: ['Sexta', 'Sábado', 'Domingo'], valores: [120, 200, 150], eixo: 'Ingressos' },
  { nivel: 3, tipo: 'colunas', texto: 'O museu recebeu 300 visitantes no sábado e 450 no domingo.', rotulos: ['Sábado', 'Domingo'], valores: [300, 450], eixo: 'Visitantes' },
  { nivel: 3, tipo: 'barras', texto: 'Gabriel deu 6.000 passos, Clara 8.500 e Rafael 5.000.', rotulos: ['Gabriel', 'Clara', 'Rafael'], valores: [6000, 8500, 5000], eixo: 'Passos' },
  { nivel: 3, tipo: 'colunas', texto: 'O abrigo recebeu 25 cães, 18 gatos, 6 coelhos e 4 aves.', rotulos: ['Cães', 'Gatos', 'Coelhos', 'Aves'], valores: [25, 18, 6, 4], eixo: 'Animais' },
  { nivel: 3, tipo: 'linha', texto: 'A loja vendeu R$ 450, R$ 300, R$ 560, R$ 400 e R$ 700 de segunda a sexta.', rotulos: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], valores: [450, 300, 560, 400, 700], eixo: 'Vendas (R$)' },
  { nivel: 3, tipo: 'linha', texto: 'O site teve 100, 150, 130, 200 e 350 acessos de segunda a sexta.', rotulos: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], valores: [100, 150, 130, 200, 350], eixo: 'Acessos' },
  { nivel: 3, tipo: 'linha', texto: 'O coração bateu 70 vezes por minuto em repouso, 140 correndo e 85 descansando.', rotulos: ['Repouso', 'Corrida', 'Descanso'], valores: [70, 140, 85], eixo: 'Batimentos por minuto' },
  { nivel: 3, tipo: 'linha', texto: 'A represa estava com 40%, 45%, 52% e 60% de água de segunda a quinta.', rotulos: ['Seg', 'Ter', 'Qua', 'Qui'], valores: [40, 45, 52, 60], eixo: 'Nível da água (%)' },
  { nivel: 3, tipo: 'linha', texto: 'O carro estava a 40, 80, 100 e 0 km/h aos 10, 20, 30 e 40 minutos.', rotulos: ['10 min', '20 min', '30 min', '40 min'], valores: [40, 80, 100, 0], eixo: 'Velocidade (km/h)' },
  { nivel: 3, tipo: 'linha', texto: 'Choveu 10 mm em janeiro, 25 em fevereiro, 50 em março e 5 em abril.', rotulos: ['Jan', 'Fev', 'Mar', 'Abr'], valores: [10, 25, 50, 5], eixo: 'Chuva (mm)' },
  { nivel: 3, tipo: 'linha', texto: 'O canal teve 500, 800, 1.200 e 2.000 inscritos de janeiro a abril.', rotulos: ['Jan', 'Fev', 'Mar', 'Abr'], valores: [500, 800, 1200, 2000], eixo: 'Inscritos' },
  { nivel: 3, tipo: 'linha', texto: 'O metrô levou 1.000 passageiros às 7h, 2.500 às 8h, 800 às 10h e 1.800 às 18h.', rotulos: ['7h', '8h', '10h', '18h'], valores: [1000, 2500, 800, 1800], eixo: 'Passageiros' },
  { nivel: 3, tipo: 'linha', texto: 'Mariana tirou 6,0, 7,5, 8,0 e 9,5 nos quatro bimestres.', rotulos: ['1º bim.', '2º bim.', '3º bim.', '4º bim.'], valores: [6, 7.5, 8, 9.5], eixo: 'Nota' },
  { nivel: 3, tipo: 'linha', texto: 'A casa gastou 10, 12, 11 e 15 kWh de energia de segunda a quinta.', rotulos: ['Seg', 'Ter', 'Qua', 'Qui'], valores: [10, 12, 11, 15], eixo: 'Consumo (kWh)' },
  { nivel: 3, tipo: 'linha', texto: 'O hospital atendeu 30, 55, 80 e 40 casos de gripe em 4 semanas.', rotulos: ['1ª sem.', '2ª sem.', '3ª sem.', '4ª sem.'], valores: [30, 55, 80, 40], eixo: 'Casos de gripe' },
  { nivel: 3, tipo: 'pizza', texto: 'Doadores de sangue: 45% tipo O, 35% tipo A, 15% tipo B e 5% tipo AB.', rotulos: ['Tipo O', 'Tipo A', 'Tipo B', 'Tipo AB'], valores: [45, 35, 15, 5] },
  { nivel: 3, tipo: 'pizza', texto: 'A energia do país: 65% hidrelétrica, 15% eólica, 10% solar e 10% de outras fontes.', rotulos: ['Hidrelétrica', 'Eólica', 'Solar', 'Outras'], valores: [65, 15, 10, 10] },
  { nivel: 3, tipo: 'pizza', texto: 'O dia de Ana: 33% dormindo, 25% na escola, 17% estudando e 25% em lazer.', rotulos: ['Dormindo', 'Escola', 'Estudando', 'Lazer'], valores: [33, 25, 17, 25] },
  { nivel: 3, tipo: 'pizza', texto: 'O zoológico tem 50% de mamíferos, 30% de aves, 15% de répteis e 5% de anfíbios.', rotulos: ['Mamíferos', 'Aves', 'Répteis', 'Anfíbios'], valores: [50, 30, 15, 5] },
  { nivel: 3, tipo: 'pizza', texto: 'A água da casa: 45% no banho, 25% na descarga, 20% na cozinha e 10% na roupa.', rotulos: ['Banho', 'Descarga', 'Cozinha', 'Roupa'], valores: [45, 25, 20, 10] },
  { nivel: 3, tipo: 'pizza', texto: 'O pão leva 60% de farinha, 30% de água, 5% de fermento e 5% de sal e açúcar.', rotulos: ['Farinha', 'Água', 'Fermento', 'Sal e açúcar'], valores: [60, 30, 5, 5] },
];

export { PERGUNTAS_GRAFICOS };
