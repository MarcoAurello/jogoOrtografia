import app from './app';
import connection from './config/connection';
import { apagarCompeticoesSemLogin } from './services/dados';

const PORT = process.env.PORT || 3333;

connection
  .authenticate()
  .then(() => console.log('Conexão com o banco de dados estabelecida.'))
  .catch((error) => console.error('Erro ao conectar ao banco de dados:', error.message));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// competição criada sem login: some do banco (com o ranking) 24 h depois de criada. Apaga as vencidas ao subir e a
// cada 10 minutos (quem abrir um link vencido antes disso também já apaga aquela competição na hora).
const limparCompeticoes = () => apagarCompeticoesSemLogin()
  .then((n) => { if (n) console.log(`Competições sem login vencidas apagadas: ${n}.`); })
  .catch((error) => console.error('Erro ao apagar as competições sem login vencidas:', error.message));
setTimeout(limparCompeticoes, 30 * 1000);
setInterval(limparCompeticoes, 10 * 60 * 1000);
