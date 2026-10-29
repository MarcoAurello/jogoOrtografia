'use strict';

// escolas: o mesmo app com a marca de cada uma (pedagociagamificada.com.br/<slug>)
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('escolas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      slug: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true
      },
      nome: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      slogan: {
        type: Sequelize.STRING(160),
        allowNull: true
      },
      cor: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#1fa2b0'
      },
      destaque: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#f9c62b'
      },
      // logo pequeno (até 240 px) em data URL, ou o caminho de um arquivo do app
      logo: {
        type: Sequelize.TEXT('medium'),
        allowNull: true
      },
      // planilha do Google da escola (até a fase 4); vazio = planilha principal
      script: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      // teste: 14 dias grátis (teste_ate); ativo: escola que assinou
      plano: {
        type: Sequelize.ENUM('teste', 'ativo'),
        allowNull: false,
        defaultValue: 'teste'
      },
      teste_ate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ativa: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('escolas');
  }
};
