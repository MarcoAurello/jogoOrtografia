import { Sequelize } from 'sequelize';
import dbConfig from './database.js';

const env = (process.env.NODE_ENV || 'development') as keyof typeof dbConfig;
const config = dbConfig[env];

const connection = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: Number(config.port),
    dialect: 'mysql',
    timezone: '-03:00',
    logging: false,
  },
);

export default connection;
