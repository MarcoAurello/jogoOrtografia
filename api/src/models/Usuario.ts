import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute
} from "sequelize";
import bcrypt from "bcryptjs";
import sequelize from "../config/connection";
import Escola from "./Escola";

export type Perfil = "admin" | "coordenacao" | "professor";

class Usuario extends Model<
  InferAttributes<Usuario>,
  InferCreationAttributes<Usuario>
> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare nome: string;
  declare email: string;
  declare senha: string;
  declare perfil: CreationOptional<Perfil>;
  declare ativo: CreationOptional<boolean>;
  declare primeiro_login: CreationOptional<boolean>;
  declare ultimo_acesso: Date | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare escola?: NonAttribute<Escola | null>;

  toJSON() {
    const values = { ...this.get() } as Record<string, unknown>;
    delete values.senha;
    return values;
  }
}

Usuario.init(
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
      type: DataTypes.STRING(120),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    perfil: {
      type: DataTypes.ENUM("admin", "coordenacao", "professor"),
      allowNull: false,
      defaultValue: "professor"
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    primeiro_login: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: "usuarios",
    modelName: "Usuario",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    hooks: {
      beforeCreate: async (usuario) => {
        usuario.senha = await bcrypt.hash(usuario.senha, 8);
      },
      beforeUpdate: async (usuario) => {
        if (usuario.changed("senha")) {
          usuario.senha = await bcrypt.hash(usuario.senha, 8);
        }
      }
    }
  }
);

Usuario.belongsTo(Escola, { foreignKey: "escola_id", as: "escola" });
Escola.hasMany(Usuario, { foreignKey: "escola_id", as: "usuarios" });

export default Usuario;
