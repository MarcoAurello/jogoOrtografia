if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET não definido. Configure essa variável de ambiente (api/.env ou Dokploy) antes de iniciar o servidor — sem ela, o token não teria um segredo seguro para assinar/validar.'
  );
}

export default {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '12h',
};
