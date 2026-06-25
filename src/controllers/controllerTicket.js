const Ticket = require("../db/ticketDB");
const TicketMessage = require("../db/ticketMessageDB");
const Notification = require("../db/notificationDB");
const SiteConfig = require("../db/siteConfigDB");
const User = require("../db/userDB");
const { notifyAdminNewMessage, notifyUserReply } = require("../utils/mailer");
const { uploadImage } = require("../utils/uploader");

const abs = (req, p) => `${req.protocol}://${req.get("host")}${p}`;
const snippet = (s) => (s.length > 140 ? s.slice(0, 140) + "…" : s);

async function trySend(fn) {
  try { await fn(); } catch (e) { console.error("Falha ao enviar e-mail de notificação:", e.message); }
}

const { sendError } = require("../utils/responseHelper");
const warn = (req, res, info, url, status = 500) =>
  sendError(req, res, info, "warning", {}, status, url);

// Helper para processar array de arquivos enviados via multer
async function processAttachments(files) {
  const attachments = [];
  if (files && files.length > 0) {
    for (const file of files) {
      attachments.push({
        url: "/uploads/tickets/" + file.filename,
        name: file.originalname,
        type: file.mimetype,
        size: file.size
      });
    }
  }
  return attachments;
}

module.exports = {
  // ---------------- USUÁRIO ----------------

  // GET /account/tickets
  listMine: async (req, res) => {
    try {
      const tickets = await Ticket.find({ user: req.session.user.id }).sort({ lastMessageAt: -1 }).lean();
      for (const t of tickets) {
        t.unread = await TicketMessage.countDocuments({ ticket: t._id, senderType: "admin", read: false, isInternal: false });
      }
      res.render("ticketsList", { tickets, isAdmin: false });
    } catch (e) { warn(req, res, e.message, "/account"); }
  },

  // POST /account/tickets  (abre novo ticket)
  create: async (req, res) => {
    try {
      const subject = (req.body.subject || "").trim();
      const body = (req.body.body || "").trim();
      const category = (req.body.category || "Geral").trim();
      
      if (!subject || !body) return res.redirect("/account/tickets");

      const attachments = await processAttachments(req.files);

      const u = req.session.user;
      const ticket = await Ticket.create({
        user: u.id, userName: u.name, userEmail: u.email,
        subject: subject.slice(0, 140), category, lastMessageAt: new Date(),
        status: "pending", priority: "normal"
      });
      await TicketMessage.create({ ticket: ticket._id, senderType: "user", body: body.slice(0, 4000), attachments });

      const link = `/admin/dashboard/tickets/${ticket._id}`;
      await Notification.create({ 
        recipientType: "admin", 
        recipientId: "admin", 
        type: "new_message", 
        category: "ticket",
        actorName: u.name,
        actorAvatar: u.avatar || "",
        text: `Nova mensagem de ${u.name}: ${subject}`, 
        link 
      });

      const site = await SiteConfig.getSingleton();
      await trySend(() => notifyAdminNewMessage(site.contactEmail, u.name, subject, snippet(body), abs(req, link)));

      res.redirect(`/account/tickets/${ticket._id}`);
    } catch (e) { warn(req, res, e.message, "/account/tickets"); }
  },

  // GET /account/tickets/:id
  threadMine: async (req, res) => {
    try {
      const ticket = await Ticket.findOne({ _id: req.params.id, user: req.session.user.id }).lean();
      if (!ticket) return warn(req, res, "Conversa não encontrada.", "/account/tickets", 404);

      // Usuário não vê notas internas
      const messages = await TicketMessage.find({ ticket: ticket._id, isInternal: false }).sort({ createdAt: 1 }).lean();
      
      await TicketMessage.updateMany({ ticket: ticket._id, senderType: "admin", read: false, isInternal: false }, { read: true });
      await Notification.updateMany({ recipientType: "user", recipientId: req.session.user.id, link: `/account/tickets/${ticket._id}`, read: false }, { read: true });

      res.render("ticketThread", {
        ticket, messages, isAdmin: false,
        replyUrl: `/account/tickets/${ticket._id}/reply`,
        backUrl: "/account/tickets",
        userAvatar: null // não usado pelo user layout
      });
    } catch (e) { warn(req, res, e.message, "/account/tickets"); }
  },

  // POST /account/tickets/:id/reply
  replyMine: async (req, res) => {
    try {
      const body = (req.body.body || "").trim();
      const ticket = await Ticket.findOne({ _id: req.params.id, user: req.session.user.id });
      if (!ticket) return warn(req, res, "Conversa não encontrada.", "/account/tickets", 404);
      if (!body && (!req.files || req.files.length === 0)) {
         return res.json({ error: "Mensagem vazia." });
      }
      
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
         if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
           return res.status(403).json({ error: "Este ticket já foi resolvido e não aceita novas mensagens." });
         }
         return warn(req, res, "Este ticket já foi resolvido e não aceita novas mensagens.", `/account/tickets/${ticket._id}`, 403);
      }

      const attachments = await processAttachments(req.files);
      const newMessage = await TicketMessage.create({ ticket: ticket._id, senderType: "user", body: body.slice(0, 4000), attachments });
      
      ticket.lastMessageAt = new Date();
      if (ticket.status === "closed" || ticket.status === "resolved") ticket.status = "pending";
      await ticket.save();

      const link = `/admin/dashboard/tickets/${ticket._id}`;
      await Notification.create({ 
        recipientType: "admin", 
        recipientId: "admin", 
        type: "new_message", 
        category: "ticket",
        actorName: ticket.userName,
        actorAvatar: req.session.user.avatar || "",
        text: `Nova mensagem de ${ticket.userName}`, 
        link 
      });
      const site = await SiteConfig.getSingleton();
      await trySend(() => notifyAdminNewMessage(site.contactEmail, ticket.userName, ticket.subject, snippet(body), abs(req, link)));

      if (req.app.get('io')) {
        req.app.get('io').to(`ticket_${ticket._id}`).emit('ticket:message:added', { ticketId: ticket._id, message: newMessage });
      }

      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.json({ success: true, message: newMessage });
      }

      res.redirect(`/account/tickets/${ticket._id}`);
    } catch (e) {
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(500).json({ error: e.message });
      }
      warn(req, res, e.message, "/account/tickets"); 
    }
  },

  // ---------------- ADMIN ----------------

  // GET /admin/dashboard/tickets
  adminList: async (req, res) => {
    try {
      const tickets = await Ticket.find().sort({ lastMessageAt: -1 }).lean();
      
      // Carregar infos complementares de preview e avatar
      for (const t of tickets) {
        t.unread = await TicketMessage.countDocuments({ ticket: t._id, senderType: "user", read: false });
        
        // Pega o primeiro ou último userMessage para usar de preview
        const firstMsg = await TicketMessage.findOne({ ticket: t._id, senderType: "user" }).sort({ createdAt: 1 }).lean();
        t.preview = firstMsg ? snippet(firstMsg.body) : "";
        
        const userDoc = await User.findById(t.user).lean();
        t.userAvatar = userDoc ? userDoc.avatar : null;
      }
      res.render("ticketsList", { tickets, isAdmin: true });
    } catch (e) { warn(req, res, e.message, "/admin/dashboard"); }
  },

  // GET /admin/dashboard/tickets/:id
  adminThread: async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id).lean();
      if (!ticket) return warn(req, res, "Conversa não encontrada.", "/admin/dashboard/tickets", 404);

      // Admin vê tudo
      const messages = await TicketMessage.find({ ticket: ticket._id }).sort({ createdAt: 1 }).lean();
      await TicketMessage.updateMany({ ticket: ticket._id, senderType: "user", read: false }, { read: true });
      await Notification.updateMany({ recipientType: "admin", link: `/admin/dashboard/tickets/${ticket._id}`, read: false }, { read: true });

      const userDoc = await User.findById(ticket.user).lean();
      const userAvatar = userDoc ? userDoc.avatar : null;

      // Pegar todas imagens do usuário para a galeria lateral
      const userGallery = messages.filter(m => m.senderType === "user" && m.attachments && m.attachments.length > 0).flatMap(m => m.attachments);

      res.render("ticketThread", {
        ticket, messages, isAdmin: true,
        replyUrl: `/admin/dashboard/tickets/${ticket._id}/reply`,
        backUrl: "/admin/dashboard/tickets",
        userAvatar,
        userGallery
      });
    } catch (e) { warn(req, res, e.message, "/admin/dashboard/tickets"); }
  },

  // POST /admin/dashboard/tickets/:id/reply
  adminReply: async (req, res) => {
    try {
      const body = (req.body.body || "").trim();
      const isInternal = req.body.isInternal === "true" || req.body.isInternal === "on";
      const ticket = await Ticket.findById(req.params.id);
      
      if (!ticket) return warn(req, res, "Conversa não encontrada.", "/admin/dashboard/tickets", 404);
      if (!body && (!req.files || req.files.length === 0)) return res.redirect(`/admin/dashboard/tickets/${ticket._id}`);

      const attachments = await processAttachments(req.files);
      const newMessage = await TicketMessage.create({ ticket: ticket._id, senderType: "admin", body: body.slice(0, 4000), attachments, isInternal });
      
      ticket.lastMessageAt = new Date();
      // Não altera status pra pending se for nota interna
      if (!isInternal && ticket.status === "closed") ticket.status = "resolved";
      await ticket.save();

      // Envia notificação ao usuário caso NÃO seja nota interna
      if (!isInternal) {
        const link = `/account/tickets/${ticket._id}`;
        await Notification.create({ 
          recipientType: "user", 
          recipientId: ticket.user, 
          type: "reply", 
          category: "ticket",
          actorName: "Suporte",
          actorAvatar: "/assets/admin1.png",
          text: "Você recebeu uma resposta do suporte", 
          link 
        });
        await trySend(() => notifyUserReply(ticket.userEmail, ticket.subject, snippet(body), abs(req, link)));
      }

      if (req.app.get('io')) {
        if (isInternal) {
          req.app.get('io').to(`ticket_${ticket._id}_admin`).emit('ticket:message:added', { ticketId: ticket._id, message: newMessage });
        } else {
          req.app.get('io').to(`ticket_${ticket._id}`).emit('ticket:message:added', { ticketId: ticket._id, message: newMessage });
        }
      }

      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.json({ success: true, message: newMessage });
      }

      res.redirect(`/admin/dashboard/tickets/${ticket._id}`);
    } catch (e) {
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(500).json({ error: e.message });
      }
      warn(req, res, e.message, "/admin/dashboard/tickets"); 
    }
  },

  // POST /admin/dashboard/tickets/delete
  adminDeleteTickets: async (req, res) => {
    try {
      const { ticketIds } = req.body;
      if (!ticketIds || ticketIds.length === 0) {
        return res.redirect("/admin/dashboard/tickets");
      }

      const ids = Array.isArray(ticketIds) ? ticketIds : [ticketIds];
      
      // Remove mensagens associadas aos tickets
      await TicketMessage.deleteMany({ ticket: { $in: ids } });
      // Remove os tickets
      await Ticket.deleteMany({ _id: { $in: ids } });

      res.redirect("/admin/dashboard/tickets");
    } catch (e) {
      console.error(e);
      res.status(500).send("Erro interno");
    }
  },

  // POST /admin/dashboard/tickets/:id/state
  updateState: async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket não encontrado." });

      if (req.body.status) ticket.status = req.body.status;
      if (req.body.priority) ticket.priority = req.body.priority;
      
      await ticket.save();

      // Emitimos o status update no websocket principal
      if (req.app.get('io')) {
        req.app.get('io').to(`ticket_${ticket._id}`).emit('ticket:state:updated', { ticketId: ticket._id, status: ticket.status, priority: ticket.priority });
      }

      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.json({ success: true, status: ticket.status, priority: ticket.priority });
      }

      res.redirect(`/admin/dashboard/tickets/${ticket._id}`);
    } catch (e) {
      console.error(e);
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(500).json({ error: e.message });
      }
      res.redirect("/admin/dashboard/tickets");
    }
  },

  // ---------------- NOTIFICAÇÕES ----------------

  // GET /notifications/unread-count  -> { count }
  unreadCount: async (req, res) => {
    try {
      let count = 0;
      if (req.session.authenticated) {
        count = await Notification.countDocuments({ recipientType: "admin", read: false });
      } else if (req.session.user) {
        count = await Notification.countDocuments({ recipientType: "user", recipientId: req.session.user.id, read: false });
      }
      res.json({ count });
    } catch (e) { res.json({ count: 0 }); }
  }
};
