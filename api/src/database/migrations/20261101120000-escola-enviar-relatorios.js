'use strict';

// O administrador decide, por escola, se o sistema manda por e-mail o relatório de cada partida para o professor.
// Começa ligado (como sempre foi) para nada mudar nas escolas que já usam.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('escolas', 'enviar_relatorios', {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, after: 'script'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('escolas', 'enviar_relatorios');
  }
};
