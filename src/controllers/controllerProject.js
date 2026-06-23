const ProjectsDB = require("../db/projectsDB");
const Like = require("../db/likeDB");
const Comment = require("../db/commentDB");

module.exports = {
  // GET /projeto/:id — página de detalhe com curtidas e comentários
  detail: async (req, res) => {
    try {
      const { id } = req.params;
      const project = await ProjectsDB.findById(id);
      if (!project) {
        return res.status(404).render("warning", {
          title: "Oops!", info: "Projeto não encontrado.", textButton: "Voltar", url: "/"
        });
      }

      const userId = req.session.user ? req.session.user.id : null;
      const [likeCount, likedByMe, comments] = await Promise.all([
        Like.countDocuments({ project: id }),
        userId ? Like.exists({ project: id, user: userId }) : false,
        Comment.find({ project: id }).sort({ createdAt: -1 }).lean()
      ]);

      res.render("projectDetail", {
        project,
        likeCount,
        likedByMe: Boolean(likedByMe),
        comments
      });
    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!", info: error.message, textButton: "Voltar", url: "/"
      });
    }
  },

  // POST /projeto/:id/like — alterna a curtida (requer login)
  toggleLike: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;

      const existing = await Like.findOne({ project: id, user: userId });
      if (existing) {
        await existing.deleteOne();
      } else {
        await Like.create({ project: id, user: userId });
      }
      res.redirect(req.get("Referer") || "/projeto/" + id);
    } catch (error) {
      // Em corrida de índice único, ignora duplicidade
      if (error.code === 11000) return res.redirect(req.get("Referer") || "/projeto/" + req.params.id);
      res.status(500).render("warning", {
        title: "Aviso!", info: error.message, textButton: "Voltar", url: "/projeto/" + req.params.id
      });
    }
  },

  // POST /projeto/:id/comment — adiciona comentário (requer login)
  addComment: async (req, res) => {
    try {
      const { id } = req.params;
      const body = (req.body.body || "").trim();

      if (!body) {
        return res.redirect("/projeto/" + id);
      }
      const project = await ProjectsDB.findById(id);
      if (!project) {
        return res.status(404).render("warning", {
          title: "Oops!", info: "Projeto não encontrado.", textButton: "Voltar", url: "/"
        });
      }

      await Comment.create({
        project: id,
        user: req.session.user.id,
        userName: req.session.user.name,
        body: body.slice(0, 2000)
      });
      res.redirect("/projeto/" + id + "#comentarios");
    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!", info: error.message, textButton: "Voltar", url: "/projeto/" + req.params.id
      });
    }
  },

  // POST /projeto/:id/comment/:commentId/delete — autor remove o próprio comentário
  deleteComment: async (req, res) => {
    try {
      const { id, commentId } = req.params;
      await Comment.deleteOne({ _id: commentId, user: req.session.user.id });
      res.redirect("/projeto/" + id + "#comentarios");
    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!", info: error.message, textButton: "Voltar", url: "/projeto/" + req.params.id
      });
    }
  }
};
