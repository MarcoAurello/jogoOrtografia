'use strict';

// Família: o perfil "responsavel" (pai/mãe) com login próprio, ligado aos filhos (N:N), e a página de cadastro da
// família, de endereço fixo: a da escola (/<escola>/cadastro) e a do professor avulso (/cadastro/<apelido>). O
// responsável preenche, autoriza (LGPD) e cadastra os filhos, que já nascem ligados à escola (sem turma: "aguardando
// turma") ou como pacientes do professor avulso (alunos.professor_id), cada filho com um PIN de 4 números (alunos.pin_hash). A escola e o professor avulso abrem e fecham o
// cadastro com uma chave (aceita_cadastro_familia, começa desligada).
// Também: os recados para a família (separados das observações internas, para nada interno vazar por engano) e o que
// a família pode ver: a escola (e o professor avulso) liga e desliga cada relatório; a ficha do aluno pode ter uma
// exceção. visivel_familia nulo = o padrão (jogos e recados ligados; plano e anamnese desligados), ver acessoAluno.ts.
// partidas.local: onde o aluno jogou (escola ou casa, pela conta do responsável).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const datas = { created_at: { type: Sequelize.DATE, allowNull: false }, updated_at: { type: Sequelize.DATE, allowNull: false } };
    const aluno = { type: Sequelize.UUID, allowNull: false, references: { model: 'alunos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' };
    const usuario = { type: Sequelize.UUID, allowNull: true, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' };

    await queryInterface.changeColumn('usuarios', 'perfil', {
      type: Sequelize.ENUM('admin', 'coordenacao', 'professor', 'responsavel'), allowNull: false, defaultValue: 'professor'
    });

    // ---------- responsável ↔ aluno (N:N) ----------
    await queryInterface.createTable('responsavel_alunos', {
      responsavel_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      aluno_id: { ...aluno, primaryKey: true },
      parentesco: { type: Sequelize.STRING(40), allowNull: true },   // mãe, pai, avó...
      origem: { type: Sequelize.STRING(20), allowNull: false },   // pagina_cadastro | cadastro_proprio | compartilhamento
      consentimento_em: { type: Sequelize.DATE, allowNull: true },   // LGPD: quando este responsável autorizou
      ...datas
    });
    await queryInterface.addIndex('responsavel_alunos', ['aluno_id']);

    // ---------- página de cadastro da família ----------
    await queryInterface.addColumn('escolas', 'aceita_cadastro_familia', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('usuarios', 'aceita_cadastro_familia', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    // o endereço do professor avulso (/cadastro/ana-souza), gerado a partir do nome na primeira vez que ele abre a tela
    await queryInterface.addColumn('usuarios', 'apelido', { type: Sequelize.STRING(60), allowNull: true, unique: true });
    await queryInterface.addColumn('alunos', 'professor_id', usuario);   // paciente sem turma do professor avulso
    await queryInterface.addColumn('alunos', 'cadastro_origem', { type: Sequelize.STRING(20), allowNull: true });   // familia
    // o PIN de 4 números do aluno cadastrado pela família (só o hash, bcrypt); sem PIN = aluno avulso, entra só com o nome.
    // (alunos.senha_figuras, da primeira migração, nunca foi conferida: continua só preenchida, sem uso)
    await queryInterface.addColumn('alunos', 'pin_hash', { type: Sequelize.STRING(60), allowNull: true });

    // ---------- recados para a família ----------
    await queryInterface.createTable('recados_familia', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      escola_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'escolas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      aluno_id: aluno,
      autor_id: usuario,
      autor_nome: { type: Sequelize.STRING(120), allowNull: false },
      texto: { type: Sequelize.TEXT, allowNull: false },
      ...datas
    });
    await queryInterface.addIndex('recados_familia', ['aluno_id']);

    // ---------- o que a família vê ----------
    await queryInterface.addColumn('escolas', 'visivel_familia', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.addColumn('usuarios', 'visivel_familia', { type: Sequelize.JSON, allowNull: true });   // professor avulso
    await queryInterface.addColumn('alunos', 'visivel_familia', { type: Sequelize.JSON, allowNull: true });   // exceção na ficha

    // a anamnese que o próprio responsável preencheu pela conta dele (fase 3); ele sempre vê as respostas dele
    await queryInterface.addColumn('anamneses', 'responsavel_id', usuario);

    await queryInterface.addColumn('partidas', 'local', { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'escola' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('partidas', 'local');
    await queryInterface.removeColumn('anamneses', 'responsavel_id');
    for (const t of ['alunos', 'usuarios', 'escolas']) await queryInterface.removeColumn(t, 'visivel_familia');
    await queryInterface.dropTable('recados_familia');
    for (const c of ['pin_hash', 'cadastro_origem', 'professor_id']) await queryInterface.removeColumn('alunos', c);
    for (const c of ['apelido', 'aceita_cadastro_familia']) await queryInterface.removeColumn('usuarios', c);
    await queryInterface.removeColumn('escolas', 'aceita_cadastro_familia');
    await queryInterface.dropTable('responsavel_alunos');
    await queryInterface.sequelize.query("DELETE FROM usuarios WHERE perfil = 'responsavel'");
    await queryInterface.changeColumn('usuarios', 'perfil', {
      type: Sequelize.ENUM('admin', 'coordenacao', 'professor'), allowNull: false, defaultValue: 'professor'
    });
  }
};
