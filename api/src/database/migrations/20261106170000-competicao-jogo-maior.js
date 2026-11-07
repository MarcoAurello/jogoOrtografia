'use strict';

// Competição de questionário: o jogo é "quiz:<id do questionário>". O id novo (UUID) tem 36 letras e o texto todo 41,
// mas a coluna guardava 40 e a API cortava em 30 — o id saía cortado e o aluno clicava na competição e nada abria.
// (Os questionários trazidos da planilha antiga têm id curto, por isso esses funcionavam.) A coluna passa a 80 e as
// competições já gravadas com o id cortado (exatamente 30 letras) são completadas com o questionário da mesma escola.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('competicoes', 'jogo', { type: Sequelize.STRING(80), allowNull: false });
    await queryInterface.sequelize.query(`
      UPDATE competicoes c
      JOIN questionarios q
        ON q.id LIKE CONCAT(SUBSTRING(c.jogo, 6), '%') AND q.escola_id <=> c.escola_id
      SET c.jogo = CONCAT('quiz:', q.id)
      WHERE c.jogo LIKE 'quiz:%' AND CHAR_LENGTH(c.jogo) = 30`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('competicoes', 'jogo', { type: Sequelize.STRING(40), allowNull: false });
  }
};
