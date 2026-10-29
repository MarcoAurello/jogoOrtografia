'use strict';

// alunos: só o nome de exibição (primeiro nome + inicial) e a turma — nada de CPF, data de nascimento ou foto (LGPD).
// A senha é uma sequência de 3 figuras (de 9) e fica legível para o professor, que precisa mostrá-la ao aluno;
// a proteção é a trava: 5 erros seguidos bloqueiam o login daquele aluno por 1 minuto.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('alunos', {
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
      turma_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'turmas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      nome: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      // índices das figuras, ex.: "3,7,1"
      senha_figuras: {
        type: Sequelize.STRING(8),
        allowNull: false
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      tentativas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      bloqueado_ate: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.addIndex('alunos', ['turma_id', 'nome']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('alunos');
  }
};
