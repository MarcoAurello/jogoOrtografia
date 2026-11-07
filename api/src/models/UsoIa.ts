import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional
} from "sequelize";
import sequelize from "../config/connection";

// uma geração de questões por IA que deu certo (para o limite diário e para saber o uso); o arquivo não é guardado
class UsoIa extends Model<InferAttributes<UsoIa>, InferCreationAttributes<UsoIa>> {
  declare id: CreationOptional<string>;
  declare usuario_id: string;
  declare escola_id: string | null;
  declare provedor: string;
  declare modelo: string | null;
  declare tipo_arquivo: string;
  declare perguntas: number;
  declare created_at: CreationOptional<Date>;
}

UsoIa.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
    usuario_id: { type: DataTypes.UUID, allowNull: false },
    escola_id: { type: DataTypes.UUID, allowNull: true },
    provedor: { type: DataTypes.STRING(20), allowNull: false },
    modelo: { type: DataTypes.STRING(80), allowNull: true },
    tipo_arquivo: { type: DataTypes.STRING(10), allowNull: false },
    perguntas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false }
  },
  {
    sequelize,
    tableName: "uso_ia",
    modelName: "UsoIa",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
  }
);

export default UsoIa;
