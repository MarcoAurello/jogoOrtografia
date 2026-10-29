'use strict';

// partidas: o fim de cada jogo de um aluno logado (o mesmo conteúdo do relatório de hoje), e as habilidades que a
// partida trabalhou, para os gráficos de evolução do painel (fase 3)
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('partidas', {
      // o id vem do aparelho: a mesma partida reenviada pela fila (sem internet) não duplica
      id: {
        type: Sequelize.UUID,
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
      aluno_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'alunos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      jogo: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      titulo: {
        type: Sequelize.STRING(160),
        allowNull: false
      },
      acertos: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      total: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      estrelas: {
        type: Sequelize.TINYINT,
        allowNull: false
      },
      nivel_max: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      duracao_s: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      // quando o aluno jogou (pelo relógio do aparelho; a partida pode chegar depois, pela fila)
      jogada_em: {
        type: Sequelize.DATE,
        allowNull: false
      },
      detalhes: {
        type: Sequelize.JSON,
        allowNull: true
      },
      resumo: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    await queryInterface.addIndex('partidas', ['aluno_id', 'jogada_em']);
    await queryInterface.addIndex('partidas', ['turma_id', 'jogada_em']);

    await queryInterface.createTable('partida_habilidades', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      partida_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'partidas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      aluno_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      turma_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      habilidade: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      acertos: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      total: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      jogada_em: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    await queryInterface.addIndex('partida_habilidades', ['aluno_id', 'habilidade', 'jogada_em']);
    await queryInterface.addIndex('partida_habilidades', ['turma_id', 'habilidade', 'jogada_em']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('partida_habilidades');
    await queryInterface.dropTable('partidas');
  }
};
