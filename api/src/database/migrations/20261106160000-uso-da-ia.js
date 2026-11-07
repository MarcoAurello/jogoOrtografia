'use strict';

// Questões geradas por IA (foto ou PDF de exercício → questionário): cada geração que deu certo fica registrada (quem,
// quando, qual provedor) para o limite diário por pessoa (IA_LIMITE_DIARIO) caber na cota grátis do Gemini/Groq e
// para saber quanto se usa antes de cobrar. O arquivo enviado NUNCA é guardado: só estes números.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('uso_ia', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false, primaryKey: true },
      usuario_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      escola_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'escolas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      provedor: { type: Sequelize.STRING(20), allowNull: false },   // gemini | groq | falsa (teste)
      modelo: { type: Sequelize.STRING(80), allowNull: true },
      tipo_arquivo: { type: Sequelize.STRING(10), allowNull: false },   // foto | pdf
      perguntas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('uso_ia', ['usuario_id', 'created_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('uso_ia');
  }
};
