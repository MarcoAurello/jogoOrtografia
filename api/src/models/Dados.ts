import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import sequelize from "../config/connection";

// fase 4: os dados que ficavam na planilha do Google (e-mails, questionários, competições e ranking).
// escola_id nulo = a plataforma principal (o endereço sem escola).
const datas = {
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
};
const opcoes = (tableName: string, modelName: string) => ({
  sequelize, tableName, modelName, timestamps: true, createdAt: "created_at", updatedAt: "updated_at"
});

export class Destinatario extends Model<InferAttributes<Destinatario>, InferCreationAttributes<Destinatario>> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare nome: string;
  declare email: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
Destinatario.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: true },
  nome: { type: DataTypes.STRING(60), allowNull: false },
  email: { type: DataTypes.STRING(120), allowNull: false },
  ...datas
}, opcoes("destinatarios", "Destinatario"));

export class Pergunta extends Model<InferAttributes<Pergunta>, InferCreationAttributes<Pergunta>> {
  declare id: CreationOptional<number>;
  declare questionario_id: string;
  declare ordem: number;
  declare pergunta: string;
  declare certa: string;
  declare erradas: string[];
}
Pergunta.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  questionario_id: { type: DataTypes.UUID, allowNull: false },
  ordem: { type: DataTypes.INTEGER, allowNull: false },
  pergunta: { type: DataTypes.STRING(300), allowNull: false },
  certa: { type: DataTypes.STRING(160), allowNull: false },
  erradas: { type: DataTypes.JSON, allowNull: false }
}, { sequelize, tableName: "perguntas", modelName: "Pergunta", timestamps: false });

export class Questionario extends Model<InferAttributes<Questionario>, InferCreationAttributes<Questionario>> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare autor_id: string | null;
  declare titulo: string;
  declare id_planilha: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare perguntas?: NonAttribute<Pergunta[]>;
}
Questionario.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: true },
  autor_id: { type: DataTypes.UUID, allowNull: true },
  titulo: { type: DataTypes.STRING(80), allowNull: false },
  id_planilha: { type: DataTypes.STRING(30), allowNull: true },
  ...datas
}, opcoes("questionarios", "Questionario"));
Questionario.hasMany(Pergunta, { foreignKey: "questionario_id", as: "perguntas" });

export class Competicao extends Model<InferAttributes<Competicao>, InferCreationAttributes<Competicao>> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare autor_id: string | null;
  declare codigo: string;
  declare nome: string;
  declare jogo: string;
  declare jogo_nome: string;
  declare email: string | null;
  declare encerra_em: Date;
  declare id_planilha: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
Competicao.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: true },
  autor_id: { type: DataTypes.UUID, allowNull: true },
  codigo: { type: DataTypes.STRING(8), allowNull: false },
  nome: { type: DataTypes.STRING(60), allowNull: false },
  jogo: { type: DataTypes.STRING(40), allowNull: false },
  jogo_nome: { type: DataTypes.STRING(60), allowNull: false },
  email: { type: DataTypes.STRING(120), allowNull: true },
  encerra_em: { type: DataTypes.DATE, allowNull: false },
  id_planilha: { type: DataTypes.STRING(30), allowNull: true },
  ...datas
}, opcoes("competicoes", "Competicao"));

export class Participacao extends Model<InferAttributes<Participacao>, InferCreationAttributes<Participacao>> {
  declare id: CreationOptional<number>;
  declare competicao_id: string;
  declare chave_nome: string;
  declare nome: string;
  declare config: string;
  declare pontos: number;
  declare acertos: number;
  declare total: number;
  declare partidas: CreationOptional<number>;
  declare melhor_em: Date;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
Participacao.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  competicao_id: { type: DataTypes.UUID, allowNull: false },
  chave_nome: { type: DataTypes.STRING(40), allowNull: false },
  nome: { type: DataTypes.STRING(40), allowNull: false },
  config: { type: DataTypes.STRING(120), allowNull: false, defaultValue: "" },
  pontos: { type: DataTypes.INTEGER, allowNull: false },
  acertos: { type: DataTypes.INTEGER, allowNull: false },
  total: { type: DataTypes.INTEGER, allowNull: false },
  partidas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  melhor_em: { type: DataTypes.DATE, allowNull: false },
  ...datas
}, opcoes("participacoes", "Participacao"));
Competicao.hasMany(Participacao, { foreignKey: "competicao_id", as: "participacoes" });
