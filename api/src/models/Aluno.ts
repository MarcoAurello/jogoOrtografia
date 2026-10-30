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
  declare turma_id: string | null;   // a turma em que foi criado (histórico); as turmas de agora estão em aluno_turmas
  declare nome: string;
  declare senha_figuras: string;
  declare ativo: CreationOptional<boolean>;
  declare tentativas: CreationOptional<number>;
  declare bloqueado_ate: Date | null;
  declare ultimo_acesso: Date | null;
  // cadastro completo (opcional) e o consentimento do responsável (LGPD), exigido para a anamnese
  declare nome_completo: CreationOptional<string | null>;
  declare data_nascimento: CreationOptional<string | null>;
  declare responsavel_nome: CreationOptional<string | null>;
  declare responsavel_contato: CreationOptional<string | null>;
  declare observacoes: CreationOptional<string | null>;
  declare consentimento_em: CreationOptional<Date | null>;
  declare consentimento_por: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  declare escola?: NonAttribute<Escola | null>;
  declare turma?: NonAttribute<Turma>;
  declare turmas?: NonAttribute<Turma[]>;
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
      allowNull: true
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
    nome_completo: { type: DataTypes.STRING(120), allowNull: true },
    data_nascimento: { type: DataTypes.DATEONLY, allowNull: true },
    responsavel_nome: { type: DataTypes.STRING(120), allowNull: true },
    responsavel_contato: { type: DataTypes.STRING(120), allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    consentimento_em: { type: DataTypes.DATE, allowNull: true },
    consentimento_por: { type: DataTypes.STRING(160), allowNull: true },
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

// o aluno pode estar em várias turmas (ou em nenhuma): a ligação tem o "ativo" daquela turma
export class AlunoTurma extends Model<InferAttributes<AlunoTurma>, InferCreationAttributes<AlunoTurma>> {
  declare aluno_id: string;
  declare turma_id: string;
  declare ativo: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
AlunoTurma.init({
  aluno_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  turma_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
}, { sequelize, tableName: "aluno_turmas", modelName: "AlunoTurma", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });
Aluno.belongsToMany(Turma, { through: AlunoTurma, foreignKey: "aluno_id", otherKey: "turma_id", as: "turmas" });
Turma.belongsToMany(Aluno, { through: AlunoTurma, foreignKey: "turma_id", otherKey: "aluno_id", as: "alunos" });

export default Aluno;
