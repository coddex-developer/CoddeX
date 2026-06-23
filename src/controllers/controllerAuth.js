const User = require("../db/userDB");
const SiteConfig = require("../db/siteConfigDB");
const Like = require("../db/likeDB");
const ProjectsDB = require("../db/projectsDB");
const Notification = require("../db/notificationDB");
const { sendVerificationCode, notifyAdminNewUser } = require("../utils/mailer");

// Regenera a sessão (anti session-fixation) e injeta o usuário logado.
function loginSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      req.session.save((err2) => (err2 ? reject(err2) : resolve()));
    });
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Envia o código sem derrubar o fluxo se o SMTP falhar (loga o erro).
async function trySendCode(email, name, code) {
  try {
    await sendVerificationCode(email, name, code);
    return true;
  } catch (err) {
    console.error("Falha ao enviar e-mail de verificação:", err.message);
    return false;
  }
}

module.exports = {
  // GET /register
  registerView: (req, res) => {
    res.render("register", { error: null, values: {} });
  },

  // POST /register
  register: async (req, res) => {
    const { name, email, password } = req.body;
    const values = { name, email };

    try {
      if (!name || !email || !password) {
        return res.status(400).render("register", { error: "Preencha todos os campos.", values });
      }
      if (!EMAIL_RE.test(email)) {
        return res.status(400).render("register", { error: "E-mail inválido.", values });
      }
      if (password.length < 6) {
        return res.status(400).render("register", { error: "A senha deve ter pelo menos 6 caracteres.", values });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail });

      if (existing) {
        // Se já existe mas não verificou, reenvia o código em vez de bloquear.
        if (!existing.emailVerified) {
          const code = await existing.setVerificationCode();
          await existing.save();
          await trySendCode(existing.email, existing.name, code);
          req.session.pendingEmail = existing.email;
          return res.redirect("/verify");
        }
        return res.status(400).render("register", { error: "Este e-mail já está cadastrado. Faça login.", values });
      }

      const user = new User({ name: name.trim(), email: normalizedEmail, password });
      const code = await user.setVerificationCode();
      await user.save();
      await trySendCode(user.email, user.name, code);

      req.session.pendingEmail = user.email;
      res.redirect("/verify");
    } catch (error) {
      res.status(500).render("register", { error: error.message, values });
    }
  },

  // GET /verify
  verifyView: (req, res) => {
    const email = req.session.pendingEmail || req.query.email || "";
    if (!email) return res.redirect("/register");
    res.render("verify", { error: null, info: null, email });
  },

  // POST /verify
  verify: async (req, res) => {
    const email = (req.body.email || req.session.pendingEmail || "").toLowerCase().trim();
    const { code } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).render("verify", { error: "Conta não encontrada.", info: null, email });

      const result = await user.checkVerificationCode(code);

      if (!result.ok) {
        const messages = {
          expired: "O código expirou. Solicite um novo.",
          too_many: "Muitas tentativas. Solicite um novo código.",
          no_code: "Nenhum código pendente. Solicite um novo.",
          invalid: "Código incorreto. Tente novamente."
        };
        return res.status(400).render("verify", { error: messages[result.reason] || "Falha na verificação.", info: null, email });
      }

      // Conta verificada: notifica o admin e loga o usuário.
      delete req.session.pendingEmail;
      try {
        await Notification.create({
          recipientType: "admin", recipientId: "admin", type: "new_user",
          text: `Novo usuário cadastrado: ${user.name}`, link: "/admin/dashboard"
        });
        const site = await SiteConfig.getSingleton();
        await notifyAdminNewUser(site.contactEmail, user);
      } catch (_) { /* não bloqueia o fluxo se a notificação falhar */ }

      await loginSession(req, user);
      res.redirect("/account");
    } catch (error) {
      res.status(500).render("verify", { error: error.message, info: null, email });
    }
  },

  // POST /verify/resend
  resend: async (req, res) => {
    const email = (req.body.email || req.session.pendingEmail || "").toLowerCase().trim();
    try {
      const user = await User.findOne({ email });
      if (user && !user.emailVerified) {
        const code = await user.setVerificationCode();
        await user.save();
        await trySendCode(user.email, user.name, code);
      }
      // Mesma resposta mesmo se não existir (evita enumeração de e-mails)
      res.render("verify", { error: null, info: "Enviamos um novo código para o seu e-mail.", email });
    } catch (error) {
      res.status(500).render("verify", { error: error.message, info: null, email });
    }
  },

  // GET /login
  loginView: (req, res) => {
    res.render("login", { error: null, values: {} });
  },

  // POST /login
  login: async (req, res) => {
    const { email, password } = req.body;
    const values = { email };
    try {
      const normalizedEmail = (email || "").toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail });
      const matches = user ? await user.comparePassword(password) : false;

      if (!user || !matches) {
        return res.status(401).render("login", { error: "E-mail ou senha incorretos.", values });
      }

      if (!user.emailVerified) {
        // Reenvia código e manda para a verificação
        const code = await user.setVerificationCode();
        await user.save();
        await trySendCode(user.email, user.name, code);
        req.session.pendingEmail = user.email;
        return res.redirect("/verify");
      }

      await loginSession(req, user);
      res.redirect("/account");
    } catch (error) {
      res.status(500).render("login", { error: error.message, values });
    }
  },

  // GET /logout
  logout: (req, res) => {
    req.session.destroy(() => res.redirect("/"));
  },

  // GET /account
  account: async (req, res) => {
    try {
      const user = await User.findById(req.session.user.id).lean();
      if (!user) {
        return req.session.destroy(() => res.redirect("/login"));
      }

      // Projetos curtidos por este usuário
      const likes = await Like.find({ user: user._id }).lean();
      const likedIds = likes.map(l => l.project);
      const likedProjects = likedIds.length
        ? await ProjectsDB.find({ _id: { $in: likedIds } }).lean()
        : [];

      res.render("account", { user, likedProjects });
    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!",
        info: error.message,
        textButton: "Voltar",
        url: "/"
      });
    }
  }
};
