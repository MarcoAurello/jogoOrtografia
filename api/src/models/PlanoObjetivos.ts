import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/connection";

// Plano de Objetivos Psicopedagógicos do aluno (PlanoController).
export const STATUS_PLANO = ["elaboracao", "ativo", "concluido"] as const;
export type StatusPlano = typeof STATUS_PLANO[number];
// habilidades: as habilidades-alvo do objetivo (as mesmas dos jogos, js/habilidades.js): sugerem os jogos e medem a evolução
export interface Objetivo { id: string; area: string; descricao: string; habilidades: string[]; jogos: string[]; recursos: string; indicador: string; prazo: string; dias: string[] }

export class PlanoObjetivos extends Model<InferAttributes<PlanoObjetivos>, InferCreationAttributes<PlanoObjetivos>> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare aluno_id: string;
  declare autor_id: string | null;
  declare profissional_nome: string;
  declare ciclo: string | null;
  declare foco: string | null;
  declare objetivos: Objetivo[];
  declare orientacoes_familia: string | null;
  declare adequacoes_escola: string[] | null;
  declare adequacoes_texto: string | null;
  declare status: StatusPlano;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
PlanoObjetivos.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: true },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  autor_id: { type: DataTypes.UUID, allowNull: true },
  profissional_nome: { type: DataTypes.STRING(120), allowNull: false },
  ciclo: { type: DataTypes.STRING(80), allowNull: true },
  foco: { type: DataTypes.TEXT, allowNull: true },
  objetivos: { type: DataTypes.JSON, allowNull: false },
  orientacoes_familia: { type: DataTypes.TEXT, allowNull: true },
  adequacoes_escola: { type: DataTypes.JSON, allowNull: true },
  adequacoes_texto: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(12), allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
}, { sequelize, tableName: "planos_objetivos", modelName: "PlanoObjetivos", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });
