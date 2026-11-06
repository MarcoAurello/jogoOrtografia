'use strict';

// Código da família (fase 4): o filho joga em casa no aparelho dele sem a conta do pai. O responsável passa o código
// (FAM-XXXXX); o aparelho guarda o código, mostra os filhos (só o apelido) e cada um entra com o PIN. Gerar um código
// novo faz o antigo deixar de valer e derruba os logins feitos com ele (o token do aluno leva o código).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('usuarios', 'codigo_familia', { type: Sequelize.STRING(12), allowNull: true, unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('usuarios', 'codigo_familia');
  }
};
