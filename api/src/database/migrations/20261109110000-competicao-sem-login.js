'use strict';

// Competição criada sem login: qualquer pessoa (até deslogada) cria a competição de um jogo e compartilha o link
// (/?comp=<código>); quem abre entra só com um apelido. É a mesma competição de sempre (tabela competicoes, ranking em
// participacoes), sem escola e sem turma, e com apagar_em: 24 h depois de criada a API apaga a competição e, pela
// chave estrangeira em cascata, o ranking dela (LGPD). As competições do professor ficam com apagar_em nulo (nada muda).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('competicoes', 'apagar_em', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addIndex('competicoes', ['apagar_em']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('competicoes', ['apagar_em']);
    await queryInterface.removeColumn('competicoes', 'apagar_em');
  }
};
