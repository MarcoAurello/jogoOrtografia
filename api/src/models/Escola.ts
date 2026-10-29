import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional
} from "sequelize";
import sequelize from "../config/connection";

export const DIAS_DE_TESTE = 14;

class Escola extends Model<
  InferAttributes<Escola, { omit: "bloqueada" }>,
  InferCreationAttributes<Escola, { omit: "bloqueada" }>
> {
  declare id: CreationOptional<string>;
  declare slug: string;
  declare nome: string;
  declare slogan: string | null;
  declare cor: CreationOptional<string>;
  declare destaque: CreationOptional<string>;
  declare logo: string | null;
  declare script: string | null;
  declare plano: CreationOptional<"teste" | "ativo">;
  declare teste_ate: Date | null;
  declare ativa: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // fora do ar: desativada pelo administrador, ou teste grátis vencido (aí fica tudo bloqueado)
  get bloqueada(): boolean {
    if (!this.ativa) return true;
    return this.plano === "teste" && !!this.teste_ate && this.teste_ate.getTime() < Date.now();
  }

  // o que o app precisa: a marca e a planilha da escola (para ler os e-mails e mandar os relatórios, até a fase 4)
  marca() {
    return {
      id: this.slug,
      nome: this.nome,
      slogan: this.slogan || "",
      cor: this.cor,
      destaque: this.destaque,
      logo: this.logo || "",
      script: this.script || "",
      bloqueada: this.bloqueada
    };
  }
}

Escola.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    slug: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    slogan: {
      type: DataTypes.STRING(160),
      allowNull: true
    },
    cor: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: "#1fa2b0"
    },
    destaque: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: "#f9c62b"
    },
    logo: {
      type: DataTypes.TEXT("medium"),
      allowNull: true
    },
    script: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    plano: {
      type: DataTypes.ENUM("teste", "ativo"),
      allowNull: false,
      defaultValue: "teste"
    },
    teste_ate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ativa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: "escolas",
    modelName: "Escola",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default Escola;
