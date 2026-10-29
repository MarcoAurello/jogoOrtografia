'use strict';

// usuários que entram com e-mail e senha: administrador da plataforma, coordenação e professores.
// O administrador não tem escola; professor sem escola usa a plataforma principal.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      escola_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'escolas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
      senha: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      perfil: {
        type: Sequelize.ENUM('admin', 'coordenacao', 'professor'),
        allowNull: false,
        defaultValue: 'professor'
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      // senha provisória (criada por outra pessoa): pede para trocar no primeiro acesso
      primeiro_login: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      ultimo_acesso: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.dropTable('usuarios');
  }
};
