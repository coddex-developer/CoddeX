const User = require("../db/userDB");

// Exige usuário logado (conta de visitante verificada)
const requireUser = async (req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  try {
    const user = await User.findById(req.session.user.id).lean();
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }
    if (user.isBlocked) {
      // Permite acesso às rotas de tickets e à própria tela de suspensão
      const p = req.path;
      if (p === '/suspended' || p === '/tickets' || p.startsWith('/tickets/')) {
        return next();
      }
      return res.redirect("/account/suspended");
    }
    return next();
  } catch (e) {
    return res.redirect("/login");
  }
};

// Permite usuário logado OU o admin (dono do site)
const requireUserOrAdmin = async (req, res, next) => {
  if (req.session.authenticated) return next();
  if (!req.session.user) return res.redirect("/login");
  
  try {
    const user = await User.findById(req.session.user.id).lean();
    if (!user || user.isBlocked) {
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(403).json({ error: "Sua conta está suspensa." });
      }
      return res.redirect("/account/suspended");
    }
    return next();
  } catch (e) {
    return res.redirect("/login");
  }
};

module.exports = { requireUser, requireUserOrAdmin };
