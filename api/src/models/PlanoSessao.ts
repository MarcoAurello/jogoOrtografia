import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/connection";

// Sessão do cronograma do plano de objetivos, com o prontuário de bordo (SessaoController).
export const STATUS_SESSAO = ["planejada", "realizada", "faltou", "cancelada"] as const;
export type StatusSessao = typeof STATUS_SESSAO[number];

export class PlanoSessao extends Model<InferAttributes<PlanoSessao>, InferCreationAttributes<PlanoSessao>> {
  declare id: CreationOptional<string>;
  declare plano_id: string;
  declare aluno_id: string;
  declare escola_id: string | null;
  declare numero: number;
  declare data: string | null;
  declare objetivos: string[];
  declare jogos: string[];
  declare atividades: string | null;
  declare status: StatusSessao;
  declare anotacao: string | null;
  declare regulacao: number | null;
  declare engajamento: number | null;
  declare autor_nome: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
PlanoSessao.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
  plano_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  escola_id: { type: DataTypes.UUID, allowNull: true },
  numero: { type: DataTypes.INTEGER, allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: true },
  objetivos: { type: DataTypes.JSON, allowNull: false },
  jogos: { type: DataTypes.JSON, allowNull: false },
  atividades: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(12), allowNull: false },
  anotacao: { type: DataTypes.TEXT, allowNull: true },
  regulacao: { type: DataTypes.INTEGER, allowNull: true },
  engajamento: { type: DataTypes.INTEGER, allowNull: true },
  autor_nome: { type: DataTypes.STRING(120), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
}, { sequelize, tableName: "plano_sessoes", modelName: "PlanoSessao", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });
