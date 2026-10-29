'use strict';

// teste grátis: quem quer conhecer a plataforma cadastra o e-mail e recebe o relatório em PDF de cada jogo.
// Guarda só o necessário para mandar os relatórios e entrar em contato (com o aceite, LGPD).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('testes_gratis', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      nome: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      // professor, psicopedagogo, coordenacao, responsavel ou outro
      perfil: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      // a escola do endereço em que se cadastrou (/escolaExemplo), se houver
      escola_slug: {
        type: Sequelize.STRING(40),
        allowNull: true
      },
      aceite_em: {
        type: Sequelize.DATE,
        allowNull: false
      },
      relatorios: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      ultimo_relatorio: {
        type: Sequelize.DATE,
        allowNull: true
      },
      // relatórios mandados no dia do ultimo_relatorio (limite por dia)
      enviados_hoje: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    await queryInterface.dropTable('testes_gratis');
  }
};
