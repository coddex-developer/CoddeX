require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Documento único (singleton) com todo o conteúdo editável do site.
const siteConfigSchema = new Schema({
  title: {
    type: String,
    default: "CoddeX Developer"
  },
  subtitle: {
    type: String,
    default: "Transformando ideias em projetos incríveis!"
  },
  titleAboutMe: {
    type: String,
    default: "Sobre Mim"
  },
  // Suporta markdown
  textAboutMe: {
    type: String,
    default: "Olá, sou Gabriel Rodrigues Lima, desenvolvedor apaixonado por tecnologia! Com habilidades de Front-End e Back-End, transformo ideias em soluções criativas e eficientes."
  },
  social: {
    github: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    instagram: { type: String, default: "" },
    whatsapp: { type: String, default: "" }
  },
  contactEmail: { type: String, default: "" },
  contactPhone: { type: String, default: "" },

  // Configuração de envio de e-mail (editável pelo dashboard; sobrepõe o .env)
  mail: {
    host: { type: String, default: "" },
    port: { type: String, default: "587" },
    secure: { type: Boolean, default: false },
    user: { type: String, default: "" },
    pass: { type: String, default: "" },
    from: { type: String, default: "" }
  },

  // Exige confirmação de e-mail (código) ao cadastrar. Se false, conta já entra ativa.
  requireEmailVerification: { type: Boolean, default: true },

  // Configuração do Cloudinary (upload de imagens)
  cloudinary: {
    cloudName: { type: String, default: "" },
    apiKey: { type: String, default: "" },
    apiSecret: { type: String, default: "" }
  }
});

// Retorna o documento de config, criando-o com os defaults caso não exista.
siteConfigSchema.statics.getSingleton = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model("SiteConfig", siteConfigSchema);
