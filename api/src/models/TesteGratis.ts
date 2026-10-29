import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional
} from "sequelize";
import sequelize from "../config/connection";

export const PERFIS_TESTE = ["professor", "psicopedagogo", "coordenacao", "responsavel", "outro"];

class TesteGratis extends Model<
  InferAttributes<TesteGratis>,
  InferCreationAttributes<TesteGratis>
> {
  declare id: CreationOptional<string>;
  declare nome: string;
  declare email: string;
  declare perfil: string;
  declare escola_slug: string | null;
  declare aceite_em: Date;
  declare relatorios: CreationOptional<number>;
  declare ultimo_relatorio: Date | null;
  declare enviados_hoje: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

TesteGratis.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    perfil: { type: DataTypes.STRING(20), allowNull: false },
    escola_slug: { type: DataTypes.STRING(40), allowNull: true },
    aceite_em: { type: DataTypes.DATE, allowNull: false },
    relatorios: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ultimo_relatorio: { type: DataTypes.DATE, allowNull: true },
    enviados_hoje: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false }
  },
  {
    sequelize,
    tableName: "testes_gratis",
    modelName: "TesteGratis",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default TesteGratis;
