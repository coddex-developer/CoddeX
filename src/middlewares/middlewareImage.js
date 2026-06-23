const multer = require("multer");

// Mantém o arquivo em memória (buffer) para enviar ao Cloudinary.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error("Apenas arquivos de imagem são permitidos."));
  }
});

module.exports = imageUpload;
