require('dotenv').config();
const Admin = require("./db/adminDB.js")
const SiteConfig = require("./db/siteConfigDB.js")
const ProjectsDB = require("./db/projectsDB.js")
const MessageDB = require("./db/messageDB.js")
const { renderMarkdown } = require("./utils/markdown.js")
const express = require('express');
const mongoose = require("mongoose");
const path = require('node:path');
const router = require('./router');
const userRouter = require('./userRouter');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Helper de markdown disponível em todas as views: <%- md(texto) %>
app.locals.md = renderMarkdown;

// Conexão com o MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectado ao banco de dados!");

    // Garante que o documento de configuração do site exista
    await SiteConfig.getSingleton();

    const adminExists = await Admin.findOne({ userAdmin: process.env.ADMIN_USER });

    if (adminExists) {
      console.log("Administrador já existe no banco de dados!");
      return;
    }

    const admin = new Admin({
      userAdmin: process.env.ADMIN_USER,
      passAdmin: process.env.ADMIN_PASS,
      role: "admin"
    });

    await admin.save();
    console.log("Administrador criado com sucesso!");
  } catch (error) {
    console.error(`Erro ao conectar ao banco de dados: ${error.message}`);
    process.exit(1);
  }
};
connectDB();

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
  }
}));

// Expõe o usuário logado (visitante) para todas as views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Para páginas do admin: disponibiliza contagem de projetos e de mensagens não lidas
app.use(async (req, res, next) => {
  res.locals.projectCount = 0;
  res.locals.unreadCount = 0;
  if (req.session && req.session.authenticated && req.path.startsWith('/admin')) {
    try {
      const [projectCount, unreadCount] = await Promise.all([
        ProjectsDB.countDocuments(),
        MessageDB.countDocuments({ completed: false })
      ]);
      res.locals.projectCount = projectCount;
      res.locals.unreadCount = unreadCount;
    } catch (_) { /* ignora falha de contagem */ }
  }
  next();
});

app.use(userRouter);
app.use(router);

// Tratamento de erros (ex.: upload inválido/grande) -> página de aviso
app.use((err, req, res, next) => {
  console.error("Erro:", err.message);
  const info = err.code === "LIMIT_FILE_SIZE"
    ? "A imagem excede o tamanho máximo de 5 MB."
    : err.message || "Ocorreu um erro inesperado.";
  res.status(400).render("warning", {
    title: "Aviso!",
    info,
    textButton: "Voltar",
    url: req.get("Referer") || "/"
  });
});

app.listen(PORT, () => { console.log(`BOAS NOVAS SEU SITE ESTÁ ATIVO http://localhost:${PORT}`) });
