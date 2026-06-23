const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("./controllers/controllerAuth");
const project = require("./controllers/controllerProject");
const ticket = require("./controllers/controllerTicket");
const { requireUser, requireUserOrAdmin } = require("./middlewares/middlewareAuth");

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

// Recuperação de senha
router.get("/forgot", auth.forgotView);
router.post("/forgot", authLimiter, auth.forgot);
router.get("/reset", auth.resetView);
router.post("/reset", verifyLimiter, auth.reset);

// Painel do usuário
router.get("/account", requireUser, auth.account);

// Projetos: detalhe público + curtidas/comentários (exigem login)
router.get("/projeto/:id", project.detail);
router.post("/projeto/:id/like", requireUser, project.toggleLike);
router.post("/projeto/:id/comment", requireUserOrAdmin, project.addComment);
router.post("/projeto/:id/comment/:commentId/like", requireUserOrAdmin, project.likeComment);
router.post("/projeto/:id/comment/:commentId/delete", requireUserOrAdmin, project.deleteComment);

// Tickets (conversas) do usuário
router.get("/account/tickets", requireUser, ticket.listMine);
router.post("/account/tickets", requireUser, ticket.create);
router.get("/account/tickets/:id", requireUser, ticket.threadMine);
router.post("/account/tickets/:id/reply", requireUser, ticket.replyMine);

// Contador de notificações não lidas (admin ou usuário) — usado pelo sininho
router.get("/notifications/unread-count", ticket.unreadCount);

module.exports = router;
