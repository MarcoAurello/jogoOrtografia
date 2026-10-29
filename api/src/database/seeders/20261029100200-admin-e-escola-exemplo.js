'use strict';

const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

// o primeiro administrador (ADMIN_EMAIL / ADMIN_SENHA do ambiente) e a Escola Exemplo, que antes vinha pronta no app.
// Roda de novo sem duplicar: só cria o que ainda não existe.
module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const senha = String(process.env.ADMIN_SENHA || '');

    if (!email || senha.length < 8) {
      console.warn('Seed do administrador ignorado: defina ADMIN_EMAIL e ADMIN_SENHA (com 8 caracteres ou mais).');
    } else {
      const [existe] = await queryInterface.sequelize.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', { replacements: [email] });
      if (!existe[0]) {
        await queryInterface.bulkInsert('usuarios', [{
          id: randomUUID(),
          escola_id: null,
          nome: 'Administrador',
          email,
          senha: await bcrypt.hash(senha, 8),
          perfil: 'admin',
          ativo: true,
          primeiro_login: false,
          created_at: now,
          updated_at: now
        }]);
      }
    }

    const [escola] = await queryInterface.sequelize.query("SELECT id FROM escolas WHERE slug = 'escolaExemplo' LIMIT 1");
    if (!escola[0]) {
      await queryInterface.bulkInsert('escolas', [{
        id: randomUUID(),
        slug: 'escolaExemplo',
        nome: 'Escola Exemplo',
        slogan: 'Aprender é uma aventura!',
        cor: '#2e7d32',
        destaque: '#ffb300',
        logo: 'assets/escolas/escola-exemplo.svg',
        script: null,
        plano: 'ativo',
        teste_ate: null,
        ativa: true,
        created_at: now,
        updated_at: now
      }]);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('escolas', { slug: 'escolaExemplo' });
  }
};
