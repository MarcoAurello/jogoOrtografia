import app from './app';
import connection from './config/connection';

const PORT = process.env.PORT || 3333;

connection
  .authenticate()
  .then(() => console.log('Conexão com o banco de dados estabelecida.'))
  .catch((error) => console.error('Erro ao conectar ao banco de dados:', error.message));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
