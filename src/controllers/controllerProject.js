const ProjectsDB = require("../db/projectsDB");
const Like = require("../db/likeDB");
const Comment = require("../db/commentDB");
const CommentLike = require("../db/commentLikeDB");
const Notification = require("../db/notificationDB");

// Identifica quem está agindo: usuário logado ou o admin (autor do site).
function getActor(req) {
  if (req.session.user) {
    return { id: req.session.user.id, name: req.session.user.name, isAuthor: false };
  }
  if (req.session.authenticated) {
    const name = (req.session.currentUser && req.session.currentUser.userAdmin) || "Autor";
    return { id: "admin", name, isAuthor: true };
  }
  return null;
}

const { sendError } = require("../utils/responseHelper");
const warn = (req, res, info, url, status = 500) =>
  sendError(req, res, info, "warning", {}, status, url);

module.exports = {
  // GET /projeto/:id — detalhe com curtidas e comentários (com respostas e curtidas)
  detail: async (req, res) => {
    try {
      const { id } = req.params;
      const project = await ProjectsDB.findById(id);
      if (!project) return warn(req, res, "Projeto não encontrado.", "/", 404);

      const actor = getActor(req);
      const actorId = actor ? actor.id : null;
      const userId = req.session.user ? req.session.user.id : null;

      const [likeCount, likedByMe, allComments] = await Promise.all([
        Like.countDocuments({ project: id }),
        userId ? Like.exists({ project: id, user: userId }) : false,
        Comment.find({ project: id }).sort({ createdAt: 1 }).lean()
      ]);

      // Curtidas dos comentários
      const commentIds = allComments.map(c => c._id);
      const clAgg = await CommentLike.aggregate([
        { $match: { comment: { $in: commentIds } } },
        { $group: { _id: "$comment", count: { $sum: 1 } } }
      ]);
      const clMap = {};
      clAgg.forEach(x => { clMap[String(x._id)] = x.count; });

      let myLikes = new Set();
      if (actorId && commentIds.length) {
        const mine = await CommentLike.find({ user: actorId, comment: { $in: commentIds } }).lean();
        myLikes = new Set(mine.map(x => String(x.comment)));
      }

      allComments.forEach(c => {
        c.likeCount = clMap[String(c._id)] || 0;
        c.likedByMe = myLikes.has(String(c._id));
        c.replies = [];
      });

      // Monta a árvore (raízes + respostas)
      const byId = {};
      allComments.forEach(c => { byId[String(c._id)] = c; });
      const roots = [];
      allComments.forEach(c => {
        if (c.parent && byId[String(c.parent)]) byId[String(c.parent)].replies.push(c);
        else if (!c.parent) roots.push(c);
      });
      roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.render("projectDetail", {
        project,
        likeCount,
        likedByMe: Boolean(likedByMe),
        comments: roots,
        commentCount: allComments.length,
        canInteract: Boolean(actor),
        actorId
      });
    } catch (e) { warn(req, res, e.message, "/"); }
  },

  // POST /projeto/:id/like — curtir projeto (somente usuário)
  toggleLike: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const existing = await Like.findOne({ project: id, user: userId });
      if (existing) await existing.deleteOne();
      else await Like.create({ project: id, user: userId });
      
      const likeCount = await Like.countDocuments({ project: id });
      if (req.app.get('io')) {
        req.app.get('io').emit('project:like:updated', { projectId: id, likeCount });
      }

      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.json({ success: true, likeCount, likedByMe: !existing });
      }

      res.redirect(req.get("Referer") || "/projeto/" + id);
    } catch (error) {
      if (error.code === 11000) return res.redirect(req.get("Referer") || "/projeto/" + req.params.id);
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(500).json({ error: error.message });
      }
      warn(req, res, error.message, "/projeto/" + req.params.id);
    }
  },

  // POST /projeto/:id/comment — comentar ou responder (usuário ou autor)
  addComment: async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor) return res.redirect("/login");

      const { id } = req.params;
      const body = (req.body.body || "").trim();
      const parentId = req.body.parent || null;
      if (!body) return res.redirect("/projeto/" + id + "#comentarios");

      const project = await ProjectsDB.findById(id);
      if (!project) return warn(req, res, "Projeto não encontrado.", "/", 404);

      let parent = null;
      if (parentId) {
        parent = await Comment.findById(parentId);
        if (!parent || String(parent.project) !== String(id)) parent = null;
      }

      const newComment = await Comment.create({
        project: id,
        user: actor.id,
        userName: actor.name,
        isAuthor: actor.isAuthor,
        parent: parent ? parent._id : null,
        body: body.slice(0, 2000)
      });

      // Notifica o autor do comentário pai quando alguém responde
      if (parent && String(parent.user) !== String(actor.id)) {
        const link = `/projeto/${id}#comentarios`;
        if (parent.isAuthor) {
          await Notification.create({ recipientType: "admin", recipientId: "admin", type: "reply", text: `${actor.name} respondeu seu comentário`, link });
        } else {
          await Notification.create({ recipientType: "user", recipientId: parent.user, type: "reply", text: `${actor.name} respondeu seu comentário`, link });
        }
      }

      const commentCount = await Comment.countDocuments({ project: id });
      if (req.app.get('io')) {
        req.app.get('io').emit('project:comment:added', { projectId: id, comment: newComment, commentCount });
      }

      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.json({ success: true, comment: newComment, commentCount });
      }

      res.redirect("/projeto/" + id + "#comentarios");
    } catch (e) {
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(500).json({ error: e.message });
      }
      warn(req, res, e.message, "/projeto/" + req.params.id); 
    }
  },

  // POST /projeto/:id/comment/:commentId/like — curtir comentário (usuário ou autor)
  likeComment: async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor) return res.redirect("/login");
      const { id, commentId } = req.params;
      const existing = await CommentLike.findOne({ user: actor.id, comment: commentId });
      if (existing) await existing.deleteOne();
      else await CommentLike.create({ user: actor.id, comment: commentId });
      res.redirect("/projeto/" + id + "#comentarios");
    } catch (error) {
      if (error.code === 11000) return res.redirect("/projeto/" + req.params.id + "#comentarios");
      warn(req, res, error.message, "/projeto/" + req.params.id);
    }
  },

  // POST /projeto/:id/comment/:commentId/delete — autor do comentário ou admin
  deleteComment: async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor) return res.redirect("/login");
      const { id, commentId } = req.params;
      const comment = await Comment.findById(commentId);
      if (comment) {
        const canDelete = actor.isAuthor || String(comment.user) === String(actor.id);
        if (canDelete) {
          const replies = await Comment.find({ parent: comment._id }).select("_id").lean();
          const ids = [comment._id, ...replies.map(r => r._id)];
          await Comment.deleteMany({ _id: { $in: ids } });
          await CommentLike.deleteMany({ comment: { $in: ids } });
        }
      }
      res.redirect("/projeto/" + id + "#comentarios");
    } catch (e) { warn(req, res, e.message, "/projeto/" + req.params.id); }
  }
};
