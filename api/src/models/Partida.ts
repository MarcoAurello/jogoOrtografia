import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute
} from "sequelize";
import sequelize from "../config/connection";
import Aluno from "./Aluno";

class Partida extends Model<
  InferAttributes<Partida>,
  InferCreationAttributes<Partida>
> {
  declare id: string;
  declare escola_id: string | null;
  declare turma_id: string;
  declare aluno_id: string;
  declare jogo: string;
  declare titulo: string;
  declare acertos: number;
  declare total: number;
  declare estrelas: number;
  declare nivel_max: number | null;
  declare duracao_s: number | null;
  declare jogada_em: Date;
  declare detalhes: unknown;
  declare resumo: unknown;
  declare created_at: CreationOptional<Date>;

  declare aluno?: NonAttribute<Aluno>;
}

Partida.init(
  {
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    escola_id: { type: DataTypes.UUID, allowNull: true },
    turma_id: { type: DataTypes.UUID, allowNull: false },
    aluno_id: { type: DataTypes.UUID, allowNull: false },
    jogo: { type: DataTypes.STRING(30), allowNull: false },
    titulo: { type: DataTypes.STRING(160), allowNull: false },
    acertos: { type: DataTypes.INTEGER, allowNull: false },
    total: { type: DataTypes.INTEGER, allowNull: false },
    estrelas: { type: DataTypes.TINYINT, allowNull: false },
    nivel_max: { type: DataTypes.INTEGER, allowNull: true },
    duracao_s: { type: DataTypes.INTEGER, allowNull: true },
    jogada_em: { type: DataTypes.DATE, allowNull: false },
    detalhes: { type: DataTypes.JSON, allowNull: true },
    resumo: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false }
  },
  {
    sequelize,
    tableName: "partidas",
    modelName: "Partida",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
  }
);

// uma linha por habilidade trabalhada na partida (para os gráficos de evolução)
export const PartidaHabilidade = sequelize.define("PartidaHabilidade", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  partida_id: { type: DataTypes.UUID, allowNull: false },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  turma_id: { type: DataTypes.UUID, allowNull: false },
  habilidade: { type: DataTypes.STRING(30), allowNull: false },
  acertos: { type: DataTypes.INTEGER, allowNull: false },
  total: { type: DataTypes.INTEGER, allowNull: false },
  jogada_em: { type: DataTypes.DATE, allowNull: false }
}, { tableName: "partida_habilidades", timestamps: false });

Partida.belongsTo(Aluno, { foreignKey: "aluno_id", as: "aluno" });
Aluno.hasMany(Partida, { foreignKey: "aluno_id", as: "partidas" });

export default Partida;
