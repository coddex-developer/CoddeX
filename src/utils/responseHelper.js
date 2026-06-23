module.exports = {
  sendError: (req, res, message, fallbackView, values = {}, status = 400, url = "back") => {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.status(status).json({ error: message });
    }
    if (fallbackView === 'warning') {
      return res.status(status).render('warning', { title: "Aviso!", info: message, textButton: "Voltar", url: url, icon: "error" });
    }
    return res.status(status).render(fallbackView, { error: message, values, info: null });
  },
  sendSuccess: (req, res, message, redirectUrl) => {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
      return res.json({ message, redirect: redirectUrl });
    }
    if (message) {
      // If we need to show a message and it's not AJAX, could use a querystring toast
      const sep = redirectUrl.includes('?') ? '&' : '?';
      return res.redirect(`${redirectUrl}${sep}toast=${encodeURIComponent(message)}`);
    }
    return res.redirect(redirectUrl);
  }
};
