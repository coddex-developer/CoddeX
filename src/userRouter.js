const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("./controllers/controllerAuth");
const project = require("./controllers/controllerProject");
const { requireUser } = require("./middlewares/middlewareAuth");

const router = express.Router();

// Resposta padrão quando o limite de requisições é atingido
const limitHandler = (req, res) => res.status(429).render("warning", {
  title: "Calma lá!",
  info: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  textButton: "Voltar",
  url: "/"
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, handler: limitHandler, standardHeaders: true, legacyHeaders: false });
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, handler: limitHandler, standardHeaders: true, legacyHeaders: false });
const resendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3, handler: limitHandler, standardHeaders: true, legacyHeaders: false });

// Cadastro
router.get("/register", auth.registerView);
router.post("/register", authLimiter, auth.register);

// Verificação por código
router.get("/verify", auth.verifyView);
router.post("/verify", verifyLimiter, auth.verify);
router.post("/verify/resend", resendLimiter, auth.resend);

// Login / logout
router.get("/login", auth.loginView);
router.post("/login", authLimiter, auth.login);
router.get("/logout", auth.logout);

// Painel do usuário
router.get("/account", requireUser, auth.account);

// Projetos: detalhe público + curtidas/comentários (exigem login)
router.get("/projeto/:id", project.detail);
router.post("/projeto/:id/like", requireUser, project.toggleLike);
router.post("/projeto/:id/comment", requireUser, project.addComment);
router.post("/projeto/:id/comment/:commentId/delete", requireUser, project.deleteComment);

module.exports = router;
