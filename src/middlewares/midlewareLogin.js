const midlewareLogin = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/admin');
  }
};

module.exports = midlewareLogin;