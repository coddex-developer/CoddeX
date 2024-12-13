const path = require("path");
const multer = require("multer");

const upload = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "assets/")
  },
  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname);
    cb(null, `coddex-${Date.now()}${extensao}`);
  }
})

module.exports = upload;