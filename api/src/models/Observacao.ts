import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/connection";

// Observação de evolução do aluno, feita pela coordenação ou pelo professor (ObservacaoController).
export const CATEGORIAS = ["aprendizagem", "comportamento", "social", "familia", "saude", "evolucao", "outro"] as const;
export type Categoria = typeof CATEGORIAS[number];

export class Observacao extends Model<InferAttributes<Observacao>, InferCreationAttributes<Observacao>> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare aluno_id: string;
  declare autor_id: string | null;
  declare autor_nome: string;
  declare data: string;
  declare categoria: Categoria;
  declare texto: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
Observacao.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: true },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  autor_id: { type: DataTypes.UUID, allowNull: true },
  autor_nome: { type: DataTypes.STRING(120), allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  categoria: { type: DataTypes.STRING(20), allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
}, { sequelize, tableName: "aluno_observacoes", modelName: "Observacao", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });
