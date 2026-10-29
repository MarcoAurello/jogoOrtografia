'use strict';

// a competição passa a ser de uma turma: o aluno entra com o código da turma e vê as competições dela
// (turma_id nulo = competição antiga, de antes da mudança, que só o professor ainda vê)
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('competicoes', 'turma_id', {
      type: Sequelize.UUID, allowNull: true, references: { model: 'turmas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
    });
    await queryInterface.addIndex('competicoes', ['turma_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('competicoes', 'turma_id');
  }
};
