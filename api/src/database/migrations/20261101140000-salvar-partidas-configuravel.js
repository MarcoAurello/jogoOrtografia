'use strict';

// Guardar as partidas dos alunos no banco (o que alimenta o painel da turma e a ficha) passa a ser configurável em três
// níveis: escola (administrador), turma e aluno (coordenação). A partida só é guardada se os três estiverem ligados.
// Tudo começa ligado, como sempre foi.
const TABELAS = ['escolas', 'turmas', 'alunos'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tabela of TABELAS) {
      await queryInterface.addColumn(tabela, 'salvar_partidas', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
    }
  },

  down: async (queryInterface) => {
    for (const tabela of TABELAS) await queryInterface.removeColumn(tabela, 'salvar_partidas');
  }
};
