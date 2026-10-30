'use strict';

// O aluno passa a ser da escola: pode estar em várias turmas (aluno_turmas) ou em nenhuma (só mapeado para análise).
// alunos.turma_id fica como a turma em que ele foi criado (histórico); quem manda agora é aluno_turmas.
// Cadastro completo do aluno (opcional) e a anamnese: modelos (questionários) e as anamneses aplicadas (presencial
// ou por link de 3 horas para a família). Anamnese costuma ter dado de saúde: o consentimento do responsável é guardado.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const datas = { created_at: { type: Sequelize.DATE, allowNull: false }, updated_at: { type: Sequelize.DATE, allowNull: false } };
    const usuario = { type: Sequelize.UUID, allowNull: true, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' };

    // ---------- aluno em várias turmas ----------
    await queryInterface.createTable('aluno_turmas', {
      aluno_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, references: { model: 'alunos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      turma_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, references: { model: 'turmas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },   // "desativado" na turma (continua na escola)
      ...datas
    });
    await queryInterface.addIndex('aluno_turmas', ['turma_id']);
    await queryInterface.sequelize.query(
      'INSERT INTO aluno_turmas (aluno_id, turma_id, ativo, created_at, updated_at) SELECT id, turma_id, ativo, created_at, updated_at FROM alunos WHERE turma_id IS NOT NULL');
    await queryInterface.changeColumn('alunos', 'turma_id', { type: Sequelize.UUID, allowNull: true });

    // ---------- cadastro do aluno (tudo opcional; o aluno que entra só com o nome não tem nada disso) ----------
    await queryInterface.addColumn('alunos', 'nome_completo', { type: Sequelize.STRING(120), allowNull: true });
    await queryInterface.addColumn('alunos', 'data_nascimento', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('alunos', 'responsavel_nome', { type: Sequelize.STRING(120), allowNull: true });
    await queryInterface.addColumn('alunos', 'responsavel_contato', { type: Sequelize.STRING(120), allowNull: true });
    await queryInterface.addColumn('alunos', 'observacoes', { type: Sequelize.TEXT, allowNull: true });
    // LGPD: quando e por quem o consentimento do responsável foi registrado (exigido para aplicar a anamnese)
    await queryInterface.addColumn('alunos', 'consentimento_em', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('alunos', 'consentimento_por', { type: Sequelize.STRING(160), allowNull: true });

    // ---------- modelos de anamnese ----------
    await queryInterface.createTable('anamnese_modelos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      escola_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'escolas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      autor_id: usuario,
      titulo: { type: Sequelize.STRING(120), allowNull: false },
      // [{ id, tipo: curta|longa|simnao|multipla|escala, texto, opcoes: [], obrigatoria }]
      perguntas: { type: Sequelize.JSON, allowNull: false },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...datas
    });
    await queryInterface.addIndex('anamnese_modelos', ['escola_id']);

    // ---------- anamneses aplicadas ----------
    await queryInterface.createTable('anamneses', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      escola_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'escolas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      aluno_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'alunos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      modelo_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'anamnese_modelos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      titulo: { type: Sequelize.STRING(120), allowNull: false },
      perguntas: { type: Sequelize.JSON, allowNull: false },   // cópia das perguntas do modelo no dia (o modelo pode mudar depois)
      respostas: { type: Sequelize.JSON, allowNull: true },
      via: { type: Sequelize.STRING(12), allowNull: false },   // presencial | link
      status: { type: Sequelize.STRING(12), allowNull: false },   // pendente (link enviado) | respondida | cancelada
      criada_por: usuario,
      respondida_por_nome: { type: Sequelize.STRING(120), allowNull: true },   // quem respondeu (professor ou o responsável, pelo link)
      token_hash: { type: Sequelize.STRING(64), allowNull: true },   // só o hash do link (o link mesmo não fica no banco)
      expira_em: { type: Sequelize.DATE, allowNull: true },
      respondida_em: { type: Sequelize.DATE, allowNull: true },
      ...datas
    });
    await queryInterface.addIndex('anamneses', ['aluno_id']);
    await queryInterface.addIndex('anamneses', ['escola_id']);
    await queryInterface.addIndex('anamneses', ['token_hash'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('anamneses');
    await queryInterface.dropTable('anamnese_modelos');
    for (const c of ['nome_completo', 'data_nascimento', 'responsavel_nome', 'responsavel_contato', 'observacoes', 'consentimento_em', 'consentimento_por']) {
      await queryInterface.removeColumn('alunos', c);
    }
    await queryInterface.dropTable('aluno_turmas');
  }
};
