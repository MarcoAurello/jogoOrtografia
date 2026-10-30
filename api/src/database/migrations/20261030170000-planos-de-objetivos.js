'use strict';

// Plano de Objetivos Psicopedagógicos do aluno: identificação (profissional, ciclo, foco), os objetivos/metas montados
// livremente (área, descrição, jogos do sistema e recursos, indicador de sucesso, prazo e dias), o plano de parceria
// (família e escola) e o status. Um aluno pode ter vários planos (um por ciclo): o histórico fica guardado.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('planos_objetivos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      escola_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'escolas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      aluno_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'alunos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      autor_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      profissional_nome: { type: Sequelize.STRING(120), allowNull: false },
      ciclo: { type: Sequelize.STRING(80), allowNull: true },   // ex.: 1º trimestre de 2026 / 3 meses
      foco: { type: Sequelize.TEXT, allowNull: true },   // abordagem / foco principal
      // [{ id, area, descricao, jogos: [id do jogo], recursos, indicador, prazo, dias: ['seg', ...] }]
      objetivos: { type: Sequelize.JSON, allowNull: false },
      orientacoes_familia: { type: Sequelize.TEXT, allowNull: true },
      adequacoes_escola: { type: Sequelize.JSON, allowNull: true },   // as sugestões marcadas
      adequacoes_texto: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(12), allowNull: false },   // elaboracao | ativo | concluido
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('planos_objetivos', ['aluno_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('planos_objetivos');
  }
};
