import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import sequelize from "../config/connection";
import Aluno from "./Aluno";
import Usuario from "./Usuario";

// Família: o responsável (usuário com perfil "responsavel") ligado aos filhos e os recados para a família
// (FamiliaController). Os recados ficam separados das observações internas de propósito.

const datas = {
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
};
const opcoes = (tableName: string, modelName: string) => ({
  sequelize, tableName, modelName, timestamps: true, createdAt: "created_at", updatedAt: "updated_at"
});

// pagina_cadastro: o responsável cadastrou o filho na página de cadastro da escola ou do professor avulso
export const ORIGENS = ["pagina_cadastro", "cadastro_proprio", "compartilhamento"] as const;
export type OrigemVinculo = typeof ORIGENS[number];

// um responsável com vários filhos; um filho com vários responsáveis
export class ResponsavelAluno extends Model<InferAttributes<ResponsavelAluno>, InferCreationAttributes<ResponsavelAluno>> {
  declare responsavel_id: string;
  declare aluno_id: string;
  declare parentesco: string | null;
  declare origem: OrigemVinculo;
  declare consentimento_em: Date | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare aluno?: NonAttribute<Aluno>;
  declare responsavel?: NonAttribute<Usuario>;
}
ResponsavelAluno.init({
  responsavel_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  aluno_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  parentesco: { type: DataTypes.STRING(40), allowNull: true },
  origem: { type: DataTypes.STRING(20), allowNull: false },
  consentimento_em: { type: DataTypes.DATE, allowNull: true },
  ...datas
}, opcoes("responsavel_alunos", "ResponsavelAluno"));
ResponsavelAluno.belongsTo(Aluno, { foreignKey: "aluno_id", as: "aluno" });
ResponsavelAluno.belongsTo(Usuario, { foreignKey: "responsavel_id", as: "responsavel" });
Aluno.belongsToMany(Usuario, { through: ResponsavelAluno, foreignKey: "aluno_id", otherKey: "responsavel_id", as: "responsaveis" });
Usuario.belongsToMany(Aluno, { through: ResponsavelAluno, foreignKey: "responsavel_id", otherKey: "aluno_id", as: "filhos" });

export class RecadoFamilia extends Model<InferAttributes<RecadoFamilia>, InferCreationAttributes<RecadoFamilia>> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare aluno_id: string;
  declare autor_id: string | null;
  declare autor_nome: string;
  declare texto: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
RecadoFamilia.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: true },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  autor_id: { type: DataTypes.UUID, allowNull: true },
  autor_nome: { type: DataTypes.STRING(120), allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
  ...datas
}, opcoes("recados_familia", "RecadoFamilia"));
