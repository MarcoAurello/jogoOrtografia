'use strict';

// fase 4: o que ficava na planilha do Google passa para o banco. Cada escola tem os seus dados (escola_id);
// escola_id nulo é a plataforma principal (o endereço sem escola). id_planilha guarda o id antigo (links já mandados).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const escola = { type: Sequelize.UUID, allowNull: true, references: { model: 'escolas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' };
    const autor = { type: Sequelize.UUID, allowNull: true, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' };
    const datas = { created_at: { type: Sequelize.DATE, allowNull: false }, updated_at: { type: Sequelize.DATE, allowNull: false } };

    // e-mails que recebem os relatórios (a antiga aba "E-mails")
    await queryInterface.createTable('destinatarios', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      escola_id: escola,
      nome: { type: Sequelize.STRING(60), allowNull: false },
      email: { type: Sequelize.STRING(120), allowNull: false },
      ...datas
    });
    await queryInterface.addIndex('destinatarios', ['escola_id', 'email'], { unique: true });

    // questionários da aula (as antigas abas "Q: ...")
    await queryInterface.createTable('questionarios', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      escola_id: escola,
      autor_id: autor,
      titulo: { type: Sequelize.STRING(80), allowNull: false },
      id_planilha: { type: Sequelize.STRING(30), allowNull: true },
      ...datas
    });
    await queryInterface.addIndex('questionarios', ['escola_id', 'id_planilha']);
    await queryInterface.createTable('perguntas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      questionario_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'questionarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      ordem: { type: Sequelize.INTEGER, allowNull: false },
      pergunta: { type: Sequelize.STRING(300), allowNull: false },
      certa: { type: Sequelize.STRING(160), allowNull: false },
      erradas: { type: Sequelize.JSON, allowNull: false }
    });

    // competições (a antiga aba "Competições")
    await queryInterface.createTable('competicoes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      escola_id: escola,
      autor_id: autor,
      codigo: { type: Sequelize.STRING(8), allowNull: false },
      nome: { type: Sequelize.STRING(60), allowNull: false },
      jogo: { type: Sequelize.STRING(40), allowNull: false },
      jogo_nome: { type: Sequelize.STRING(60), allowNull: false },
      // quem recebe os relatórios das partidas da competição
      email: { type: Sequelize.STRING(120), allowNull: true },
      encerra_em: { type: Sequelize.DATE, allowNull: false },
      id_planilha: { type: Sequelize.STRING(30), allowNull: true },
      ...datas
    });
    await queryInterface.addIndex('competicoes', ['codigo']);

    // ranking: a melhor partida de cada aluno (pelo nome) em cada configuração do jogo (a antiga aba "Ranking")
    await queryInterface.createTable('participacoes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      competicao_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'competicoes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      chave_nome: { type: Sequelize.STRING(40), allowNull: false },
      nome: { type: Sequelize.STRING(40), allowNull: false },
      config: { type: Sequelize.STRING(120), allowNull: false, defaultValue: '' },
      pontos: { type: Sequelize.INTEGER, allowNull: false },
      acertos: { type: Sequelize.INTEGER, allowNull: false },
      total: { type: Sequelize.INTEGER, allowNull: false },
      partidas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      melhor_em: { type: Sequelize.DATE, allowNull: false },
      ...datas
    });
    await queryInterface.addIndex('participacoes', ['competicao_id', 'chave_nome', 'config'], { unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('participacoes');
    await queryInterface.dropTable('competicoes');
    await queryInterface.dropTable('perguntas');
    await queryInterface.dropTable('questionarios');
    await queryInterface.dropTable('destinatarios');
  }
};
