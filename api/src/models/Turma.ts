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
import Usuario from "./Usuario";

class Turma extends Model<
  InferAttributes<Turma>,
  InferCreationAttributes<Turma>
> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare nome: string;
  declare codigo: string;
  declare ano_letivo: number;
  declare ativa: CreationOptional<boolean>;
  declare criada_por: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare escola?: NonAttribute<Escola | null>;
  declare professores?: NonAttribute<Usuario[]>;
}

Turma.init(
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
    nome: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    codigo: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true
    },
    ano_letivo: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ativa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    criada_por: {
      type: DataTypes.UUID,
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
    tableName: "turmas",
    modelName: "Turma",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

// a ligação turma ↔ professores (uma turma pode ter mais de um)
export const TurmaProfessor = sequelize.define("TurmaProfessor", {
  turma_id: { type: DataTypes.UUID, primaryKey: true },
  usuario_id: { type: DataTypes.UUID, primaryKey: true },
  created_at: { type: DataTypes.DATE, allowNull: false }
}, { tableName: "turma_professores", timestamps: true, createdAt: "created_at", updatedAt: false });

Turma.belongsTo(Escola, { foreignKey: "escola_id", as: "escola" });
Turma.belongsToMany(Usuario, { through: TurmaProfessor, foreignKey: "turma_id", otherKey: "usuario_id", as: "professores" });
Usuario.belongsToMany(Turma, { through: TurmaProfessor, foreignKey: "usuario_id", otherKey: "turma_id", as: "turmas" });

export default Turma;
