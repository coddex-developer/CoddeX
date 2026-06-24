require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Documento único (singleton) com todo o conteúdo editável do site.
const siteConfigSchema = new Schema({
  title: {
    type: String,
    default: "CoddeX Developer"
  },
  titleSize: { type: Number, default: 56 }, // px
  
  subtitle: {
    type: String,
    default: "Transformando ideias em projetos incríveis!"
  },
  subtitleSize: { type: Number, default: 20 }, // px
  
  // Visibilidade de seções
  showAbout: { type: Boolean, default: true },
  showProjects: { type: Boolean, default: true },
  showCertificates: { type: Boolean, default: true },
  showServices: { type: Boolean, default: true },
  showContact: { type: Boolean, default: true },

  titleAboutMe: {
    type: String,
    default: "Sobre Mim"
  },
  titleAboutMeSize: { type: Number, default: 32 }, // px
  
  // Suporta markdown
  textAboutMe: {
    type: String,
    default: "Olá, sou Gabriel Rodrigues Lima, desenvolvedor apaixonado por tecnologia! Com habilidades de Front-End e Back-End, transformo ideias em soluções criativas e eficientes."
  },
  textAboutMeSize: { type: Number, default: 16 }, // px

  // Serviços (Nosso Trabalho)
  servicesTitle: {
    type: String,
    default: "Nosso trabalho"
  },
  servicesTitleSize: { type: Number, default: 32 }, // px
  
  servicesSubtitle: {
    type: String,
    default: "A CoddeX Developer investe tempo e recursos para garantir a mais moderna tecnologia para o seu negócio."
  },
  servicesSubtitleSize: { type: Number, default: 16 }, // px
  
  services: {
    type: [
      {
        icon: { type: String, default: "cursor" },
        title: { type: String, default: "Páginas na web" },
        titleSize: { type: Number, default: 20 }, // px
        description: { type: String, default: "Sites e páginas para aumentar a visibilidade da sua empresa, com equipe especializada em desenvolvimento e mentoria." },
        descriptionSize: { type: Number, default: 16 } // px
      }
    ],
    default: [
      { icon: "mouse-pointer-click", title: "Páginas na web", titleSize: 20, description: "Sites e páginas para aumentar a visibilidade da sua empresa, com equipe especializada em desenvolvimento e mentoria.", descriptionSize: 16 },
      { icon: "network", title: "Sistemas claros e eficientes", titleSize: 20, description: "Projetos claros e eficientes que atendem às necessidades dos seus clientes e às expectativas dos usuários finais.", descriptionSize: 16 },
      { icon: "shield-check", title: "Backup e relatórios", titleSize: 20, description: "Relatórios detalhados, acompanhamento contínuo e mentoria especializada sobre o site ou sistema desenvolvido.", descriptionSize: 16 }
    ]
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
