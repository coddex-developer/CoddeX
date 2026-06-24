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
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server);
app.set('io', io);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Add json parser for AJAX requests

// AJAX response interceptor
app.use((req, res, next) => {
  const originalRender = res.render;
  const originalRedirect = res.redirect;

  res.render = function (view, options, callback) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      if (view === 'warning') {
        const msg = (options && options.info) ? options.info : 'Aviso do sistema.';
        return res.status(400).json({ error: msg, redirect: options && options.url ? options.url : undefined });
      }
    }
    originalRender.call(this, view, options, callback);
  };

  res.redirect = function (status, url) {
    let redirectUrl = url;
    let statusCode = status;
    if (typeof status === 'string') {
      redirectUrl = status;
      statusCode = 302;
    }
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.json({ success: true, message: 'Operação realizada com sucesso!', redirect: redirectUrl });
    }
    originalRedirect.call(this, statusCode, redirectUrl);
  };

  next();
});

// Helper de markdown disponível em todas as views: <%- md(texto) %>
app.locals.md = renderMarkdown;

// Helper de data relativa (ex: 1s, 1m, 1h, 1d, 1sem, 1a)
app.locals.timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 0) return 'agora'; // Prevenção para tempos negativos
  if (seconds < 60) return Math.floor(seconds) + 's';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd';
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return weeks + ' sem';
  const years = Math.floor(weeks / 52);
  return years + 'a';
};

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

const sessionMiddleware = session({
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
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

// Initialize sockets handlers
require('./socket')(io);

// Expõe o usuário logado (visitante) e o status de admin para todas as views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.isAdmin = Boolean(req.session && req.session.authenticated);
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

server.listen(PORT, () => { console.log(`BOAS NOVAS SEU SITE ESTÁ ATIVO http://localhost:${PORT}`) });
