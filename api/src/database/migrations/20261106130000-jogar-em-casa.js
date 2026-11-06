'use strict';

// Fase 4 da família: o aluno cadastrado joga em casa pela conta do responsável e o app lembra o login dele.
// - alunos.sessao_versao: vai dentro do token do aluno; trocar o PIN (família ou escola) soma 1 e todos os logins
//   lembrados daquele aluno param de valer (o token antigo traz o número velho).
// - partidas.turma_id e partida_habilidades.turma_id passam a aceitar vazio: o filho que joga em casa pode não ter
//   turma (paciente da psicopedagoga, aguardando turma, compra avulsa). Com turma, a partida de casa vai com ela.
//   SQL direto porque o changeColumn do Sequelize tentaria recriar a chave estrangeira de partidas.turma_id.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('alunos', 'sessao_versao', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.sequelize.query('ALTER TABLE partidas MODIFY turma_id CHAR(36) BINARY NULL');
    await queryInterface.sequelize.query('ALTER TABLE partida_habilidades MODIFY turma_id CHAR(36) BINARY NULL');
  },

  down: async (queryInterface) => {
    // partidas de casa sem turma não cabem na coluna obrigatória: saem antes
    await queryInterface.sequelize.query('DELETE FROM partida_habilidades WHERE turma_id IS NULL');
    await queryInterface.sequelize.query('DELETE FROM partidas WHERE turma_id IS NULL');
    await queryInterface.sequelize.query('ALTER TABLE partida_habilidades MODIFY turma_id CHAR(36) BINARY NOT NULL');
    await queryInterface.sequelize.query('ALTER TABLE partidas MODIFY turma_id CHAR(36) BINARY NOT NULL');
    await queryInterface.removeColumn('alunos', 'sessao_versao');
  }
};
