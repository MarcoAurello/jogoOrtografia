import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/connection";

// Anamnese: os modelos (questionários criados pela coordenação ou pelo professor) e as anamneses aplicadas a um aluno
// (presencial, preenchida por quem conversou com a família, ou por um link de 3 horas que a família responde em casa).
export type TipoPergunta = "curta" | "longa" | "simnao" | "multipla" | "varias" | "escala";   // varias: marcar quantas quiser
export interface PerguntaAnamnese { id: string; tipo: TipoPergunta; texto: string; opcoes: string[]; obrigatoria: boolean }

const datas = {
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
};
const opcoes = (tableName: string, modelName: string) => ({
  sequelize, tableName, modelName, timestamps: true, createdAt: "created_at", updatedAt: "updated_at"
});

export class AnamneseModelo extends Model<InferAttributes<AnamneseModelo>, InferCreationAttributes<AnamneseModelo>> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare autor_id: string | null;
  declare titulo: string;
  declare perguntas: PerguntaAnamnese[];
  declare ativo: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
AnamneseModelo.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: true },
  autor_id: { type: DataTypes.UUID, allowNull: true },
  titulo: { type: DataTypes.STRING(120), allowNull: false },
  perguntas: { type: DataTypes.JSON, allowNull: false },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ...datas
}, opcoes("anamnese_modelos", "AnamneseModelo"));

export class Anamnese extends Model<InferAttributes<Anamnese>, InferCreationAttributes<Anamnese>> {
  declare id: CreationOptional<string>;
  declare escola_id: string | null;
  declare aluno_id: string;
  declare modelo_id: string | null;
  declare titulo: string;
  declare perguntas: PerguntaAnamnese[];
  declare respostas: Record<string, unknown> | null;
  declare via: "presencial" | "link";
  declare status: "pendente" | "respondida" | "cancelada";
  declare criada_por: string | null;
  declare respondida_por_nome: string | null;
  declare token_hash: string | null;
  declare expira_em: Date | null;
  declare respondida_em: Date | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}
Anamnese.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
  escola_id: { type: DataTypes.UUID, allowNull: true },
  aluno_id: { type: DataTypes.UUID, allowNull: false },
  modelo_id: { type: DataTypes.UUID, allowNull: true },
  titulo: { type: DataTypes.STRING(120), allowNull: false },
  perguntas: { type: DataTypes.JSON, allowNull: false },
  respostas: { type: DataTypes.JSON, allowNull: true },
  via: { type: DataTypes.STRING(12), allowNull: false },
  status: { type: DataTypes.STRING(12), allowNull: false },
  criada_por: { type: DataTypes.UUID, allowNull: true },
  respondida_por_nome: { type: DataTypes.STRING(120), allowNull: true },
  token_hash: { type: DataTypes.STRING(64), allowNull: true },
  expira_em: { type: DataTypes.DATE, allowNull: true },
  respondida_em: { type: DataTypes.DATE, allowNull: true },
  ...datas
}, opcoes("anamneses", "Anamnese"));
