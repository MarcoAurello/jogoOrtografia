'use strict';

// Sessões do plano de objetivos (o cronograma do plano de ação): número, data, os objetivos trabalhados, os jogos e
// as atividades da sessão, o status e o prontuário de bordo (anotação, regulação emocional e engajamento de 1 a 5).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('plano_sessoes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      plano_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'planos_objetivos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      aluno_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'alunos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      escola_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'escolas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      numero: { type: Sequelize.INTEGER, allowNull: false },
      data: { type: Sequelize.DATEONLY, allowNull: true },
      objetivos: { type: Sequelize.JSON, allowNull: false },   // ids dos objetivos do plano trabalhados na sessão
      jogos: { type: Sequelize.JSON, allowNull: false },   // ids dos jogos do sistema (os mesmos dos links)
      atividades: { type: Sequelize.TEXT, allowNull: true },   // roteiro e atividades sem tela
      status: { type: Sequelize.STRING(12), allowNull: false },   // planejada | realizada | faltou | cancelada
      anotacao: { type: Sequelize.TEXT, allowNull: true },   // prontuário de bordo
      regulacao: { type: Sequelize.INTEGER, allowNull: true },   // 1 (muito desregulado) a 5 (calmo e regulado)
      engajamento: { type: Sequelize.INTEGER, allowNull: true },   // 1 (pouco) a 5 (muito)
      autor_nome: { type: Sequelize.STRING(120), allowNull: true },   // quem registrou o prontuário
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('plano_sessoes', ['plano_id', 'numero']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('plano_sessoes');
  }
};
