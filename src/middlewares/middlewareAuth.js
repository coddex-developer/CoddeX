// Exige usuário logado (conta de visitante verificada)
const requireUser = (req, res, next) => {
  if (req.session.user) return next();
  return res.redirect("/login");
};

module.exports = { requireUser };
