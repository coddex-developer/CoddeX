// Exige usuário logado (conta de visitante verificada)
const requireUser = (req, res, next) => {
  if (req.session.user) return next();
  return res.redirect("/login");
};

// Permite usuário logado OU o admin (dono do site)
const requireUserOrAdmin = (req, res, next) => {
  if (req.session.user || req.session.authenticated) return next();
  return res.redirect("/login");
};

module.exports = { requireUser, requireUserOrAdmin };
