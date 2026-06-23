const cloudinary = require("cloudinary").v2;
const SiteConfig = require("../db/siteConfigDB");

// Config do Cloudinary: banco (dashboard) tem prioridade sobre o .env.
async function getCloudinaryConfig() {
  let db = {};
  try {
    const site = await SiteConfig.getSingleton();
    db = site.cloudinary || {};
  } catch (_) { /* sem banco ainda */ }

  const cloudName = db.cloudName || process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = db.apiKey || process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = db.apiSecret || process.env.CLOUDINARY_API_SECRET || "";

  return { cloudName, apiKey, apiSecret, configured: Boolean(cloudName && apiKey && apiSecret) };
}

async function isCloudinaryConfigured() {
  return (await getCloudinaryConfig()).configured;
}

// Envia um buffer de imagem para o Cloudinary e retorna a URL segura.
async function uploadImage(buffer, folder = "coddex") {
  const cfg = await getCloudinaryConfig();
  if (!cfg.configured) {
    throw new Error("Cloudinary não está configurado. Preencha as credenciais em 'Configurar site'.");
  }
  cloudinary.config({ cloud_name: cfg.cloudName, api_key: cfg.apiKey, api_secret: cfg.apiSecret });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

// Resolve a imagem de um formulário: usa o arquivo enviado (Cloudinary) ou a URL digitada.
async function resolveImage(req, fallbackUrl, folder) {
  if (req.file && req.file.buffer) {
    return uploadImage(req.file.buffer, folder);
  }
  return fallbackUrl || "";
}

module.exports = { uploadImage, resolveImage, isCloudinaryConfigured, getCloudinaryConfig };
