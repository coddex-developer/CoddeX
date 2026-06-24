const { sendError, sendSuccess } = require("../utils/responseHelper");
const User = require("../db/userDB");
const SiteConfig = require("../db/siteConfigDB");
const Like = require("../db/likeDB");
const ProjectsDB = require("../db/projectsDB");
const Notification = require("../db/notificationDB");
const { sendVerificationCode, sendResetCode, notifyAdminNewUser } = require("../utils/mailer");

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

// Notifica o admin (painel + e-mail) sobre um novo usuário. Nunca derruba o fluxo.
async function notifyNewUser(site, user) {
  try {
    await Notification.create({
      recipientType: "admin", recipientId: "admin", type: "new_user",
      text: `Novo usuário cadastrado: ${user.name}`, link: "/admin/dashboard"
    });
    await notifyAdminNewUser(site.contactEmail, user);
  } catch (e) {
    console.error("Falha ao notificar novo usuário:", e.message);
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
        return sendError(req, res, "Preencha todos os campos.", "register", values, 400);
      }
      if (!EMAIL_RE.test(email)) {
        return sendError(req, res, "E-mail inválido.", "register", values, 400);
      }
      if (password.length < 6) {
        return sendError(req, res, "A senha deve ter pelo menos 6 caracteres.", "register", values, 400);
      }

      const normalizedEmail = email.toLowerCase().trim();
      const site = await SiteConfig.getSingleton();
      const verifEnabled = site.requireEmailVerification !== false;
      const existing = await User.findOne({ email: normalizedEmail });

      if (existing) {
        if (!existing.emailVerified) {
          if (verifEnabled) {
            const code = await existing.setVerificationCode();
            await existing.save();
            await trySendCode(existing.email, existing.name, code);
            req.session.pendingEmail = existing.email;
            return sendSuccess(req, res, "Código enviado para o seu e-mail.", "/verify");
          }
          // verificação desligada: ativa a conta e entra direto
          existing.emailVerified = true;
          await existing.save();
          await notifyNewUser(site, existing);
          await loginSession(req, existing);
          return sendSuccess(req, res, "Bem-vindo!", "/account");
        }
        return sendError(req, res, "Este e-mail já está cadastrado. Faça login.", "register", values, 400);
      }

      // Gera um username base com _ e 4 números aleatórios
      let baseName = name.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!baseName) baseName = 'user';
      let username;
      while (true) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        username = `${baseName}_${randomNum}`;
        const existingUser = await User.findOne({ username });
        if (!existingUser) break;
      }

      const user = new User({ name: name.trim(), username, email: normalizedEmail, password, emailVerified: !verifEnabled });

      if (verifEnabled) {
        const code = await user.setVerificationCode();
        await user.save();
        await trySendCode(user.email, user.name, code);
        req.session.pendingEmail = user.email;
        return sendSuccess(req, res, "Código enviado para o seu e-mail.", "/verify");
      }

      // Sem verificação: conta já entra ativa e logada
      await user.save();
      await notifyNewUser(site, user);
      await loginSession(req, user);
      sendSuccess(req, res, "Bem-vindo!", "/account");
    } catch (error) {
      sendError(req, res, error.message, "register", values, 500);
    }
  },

  // GET /verify
  verifyView: (req, res) => {
    const email = req.session.pendingEmail || req.query.email || "";
    if (!email) return res.redirect("/register");
    sendSuccess(req, res, null, "/verify");
  },

  // POST /verify
  verify: async (req, res) => {
    const email = (req.body.email || req.session.pendingEmail || "").toLowerCase().trim();
    const { code } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return sendError(req, res, "Conta não encontrada.", "verify", { email }, 404);

      const result = await user.checkVerificationCode(code);

      if (!result.ok) {
        const messages = {
          expired: "O código expirou. Solicite um novo.",
          too_many: "Muitas tentativas. Solicite um novo código.",
          no_code: "Nenhum código pendente. Solicite um novo.",
          invalid: "Código incorreto. Tente novamente."
        };
        return sendError(req, res, messages[result.reason] || "Falha na verificação.", "verify", { email }, 400);
      }

      // Conta verificada: notifica o admin e loga o usuário.
      delete req.session.pendingEmail;
      const site = await SiteConfig.getSingleton();
      await notifyNewUser(site, user);

      await loginSession(req, user);
      sendSuccess(req, res, "Bem-vindo!", "/account");
    } catch (error) {
      sendError(req, res, error.message, "verify", { email }, 500);
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
      sendSuccess(req, res, "Enviamos um novo código para o seu e-mail.", "/verify");
    } catch (error) {
      sendError(req, res, error.message, "verify", { email }, 500);
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
        return sendError(req, res, "E-mail ou senha incorretos.", "login", values, 401);
      }

      const site = await SiteConfig.getSingleton();
      const verifEnabled = site.requireEmailVerification !== false;

      if (!user.emailVerified && verifEnabled) {
        // Verificação ligada e conta não confirmada: reenvia código
        const code = await user.setVerificationCode();
        await user.save();
        await trySendCode(user.email, user.name, code);
        req.session.pendingEmail = user.email;
        return sendSuccess(req, res, "Código enviado para o seu e-mail.", "/verify");
      }

      await loginSession(req, user);
      sendSuccess(req, res, "Bem-vindo!", "/account");
    } catch (error) {
      sendError(req, res, error.message, "login", values, 500);
    }
  },

  // GET /forgot
  forgotView: (req, res) => {
    res.render("forgot", { error: null, info: null });
  },

  // POST /forgot — envia código de recuperação se o e-mail existir
  forgot: async (req, res) => {
    const email = (req.body.email || "").toLowerCase().trim();
    try {
      const user = await User.findOne({ email });
      if (user) {
        const code = await user.setResetCode();
        await user.save();
        try { await sendResetCode(user.email, user.name, code); }
        catch (e) { console.error("Falha ao enviar código de recuperação:", e.message); }
      }
      // Resposta idêntica exista ou não (evita enumeração de e-mails)
      req.session.resetEmail = email;
      sendSuccess(req, res, "Se o e-mail existir, enviamos o código.", "/reset");
    } catch (error) {
      sendError(req, res, error.message, "forgot", {}, 500);
    }
  },

  // GET /reset
  resetView: (req, res) => {
    const email = req.session.resetEmail || req.query.email || "";
    res.render("reset", { error: null, info: "Se o e-mail existir, enviamos um código.", email });
  },

  // POST /reset — valida o código e define a nova senha
  reset: async (req, res) => {
    const email = (req.body.email || req.session.resetEmail || "").toLowerCase().trim();
    const { code, password } = req.body;
    try {
      if (!password || password.length < 6) {
        return sendError(req, res, "A nova senha deve ter pelo menos 6 caracteres.", "reset", { email }, 400);
      }
      const user = await User.findOne({ email });
      const result = user ? await user.checkResetCode(code) : { ok: false, reason: "invalid" };
      if (!result.ok) {
        const msg = { expired: "O código expirou. Solicite um novo.", too_many: "Muitas tentativas. Solicite um novo código.", no_code: "Nenhum código pendente. Solicite um novo.", invalid: "Código incorreto." };
        return sendError(req, res, msg[result.reason] || "Falha ao redefinir.", "reset", { email }, 400);
      }
      user.password = password;            // o hook gera o hash
      user.resetCodeHash = null;
      user.resetCodeExpires = null;
      user.resetAttempts = 0;
      if (!user.emailVerified) user.emailVerified = true; // recuperou via e-mail => e-mail válido
      await user.save();
      delete req.session.resetEmail;
      sendSuccess(req, res, "Sua senha foi redefinida. Faça login.", "/login");
    } catch (error) {
      sendError(req, res, error.message, "reset", { email }, 500);
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

      // Fetch notifications
      const notifications = await Notification.find({ recipientType: "user", recipientId: user._id })
                                              .sort({ createdAt: -1 })
                                              .limit(30)
                                              .lean();

      res.render("account", { user, likedProjects, notifications });
    } catch (error) {
      sendError(req, res, error.message, "warning", {}, 500, "/");
    }
  }
};
