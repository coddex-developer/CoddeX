require('dotenv').config();
const Admin = require("./db/adminDB.js")
const express = require('express');
const mongoose = require("mongoose");
const path = require('node:path');
const router = require('./router');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Conexão com o MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminExists = await Admin.findOne({ userAdmin: process.env.ADMIN_USER });

    if (adminExists) {
      console.log("Administrador já existe no banco de dados!");
      return;
    }
    
    const admin = new Admin({
      userAdmin: process.env.ADMIN_USER,
      passAdmin: process.env.ADMIN_PASS,
      role: "Admin"
    });
    
    await admin.save();
    console.log("Administrador criado com sucesso!");
    console.log("Conectado ao banco de dados!");
  } catch (error) {
    console.error(`Erro ao conectar ao banco de dados: ${error.message}`);
    process.exit(1);
  }
};
connectDB();

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  }
}));

app.use(router);

app.listen(PORT, () => { console.log(`BOAS NOVAS SEU SITE ESTÁ ATIVO`) });
