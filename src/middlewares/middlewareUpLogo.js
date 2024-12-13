const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/assets/")
  },
  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname);
    cb(null, `admin1.png`);
  }
})

const uploadLogo = multer({ storage })

module.exports = uploadLogo;