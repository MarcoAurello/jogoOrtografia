import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute
} from "sequelize";
import sequelize from "../config/connection";
import Escola from "./Escola";
import Turma from "./Turma";

// as 9 figuras da senha (a ordem é a mesma do app: js/entrada.js)
export const FIGURAS = 9;
export const TAMANHO_SENHA = 3;
export const senhaAleatoria = () => Array.from({ length: TAMANHO_SENHA }, () => Math.floor(Math.random() * FIGURAS)).join(",");

class Aluno extends Model<
  InferAttributes<Aluno>,
  InferCreationAttributes<Aluno>
> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare turma_id: string;
  declare nome: string;
  declare senha_figuras: string;
  declare ativo: CreationOptional<boolean>;
  declare tentativas: CreationOptional<number>;
  declare bloqueado_ate: Date | null;
  declare ultimo_acesso: Date | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare escola?: NonAttribute<Escola | null>;
  declare turma?: NonAttribute<Turma>;
}

Aluno.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    escola_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    turma_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    nome: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    senha_figuras: {
      type: DataTypes.STRING(8),
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    tentativas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    bloqueado_ate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ultimo_acesso: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: "alunos",
    modelName: "Aluno",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

Aluno.belongsTo(Escola, { foreignKey: "escola_id", as: "escola" });
Aluno.belongsTo(Turma, { foreignKey: "turma_id", as: "turma" });
Turma.hasMany(Aluno, { foreignKey: "turma_id", as: "alunos" });

export default Aluno;
