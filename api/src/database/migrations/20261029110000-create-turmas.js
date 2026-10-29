'use strict';

// turmas: o professor cria e recebe um código curto (ex.: K7PM2) que os alunos digitam para entrar
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('turmas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      escola_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'escolas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      nome: {
        type: Sequelize.STRING(80),
        allowNull: false
      },
      codigo: {
        type: Sequelize.STRING(8),
        allowNull: false,
        unique: true
      },
      ano_letivo: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      ativa: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      criada_por: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    // uma turma pode ter mais de um professor
    await queryInterface.createTable('turma_professores', {
      turma_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'turmas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      usuario_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('turma_professores');
    await queryInterface.dropTable('turmas');
  }
};
