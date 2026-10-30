'use strict';

// Observações de evolução do aluno: anotações datadas da coordenação ou do professor (aprendizagem, comportamento,
// conversa com a família...), para acompanhar a evolução ao lado das anamneses e do desempenho nos jogos.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('aluno_observacoes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      escola_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'escolas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      aluno_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'alunos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      autor_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      autor_nome: { type: Sequelize.STRING(120), allowNull: false },   // fica mesmo se o usuário sair da escola
      data: { type: Sequelize.DATEONLY, allowNull: false },   // o dia a que a observação se refere
      categoria: { type: Sequelize.STRING(20), allowNull: false },   // aprendizagem | comportamento | social | familia | saude | evolucao | outro
      texto: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('aluno_observacoes', ['aluno_id', 'data']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('aluno_observacoes');
  }
};
