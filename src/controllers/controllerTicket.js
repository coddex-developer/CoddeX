const Ticket = require("../db/ticketDB");
const TicketMessage = require("../db/ticketMessageDB");
const Notification = require("../db/notificationDB");
const SiteConfig = require("../db/siteConfigDB");
const { notifyAdminNewMessage, notifyUserReply } = require("../utils/mailer");

const abs = (req, p) => `${req.protocol}://${req.get("host")}${p}`;
const snippet = (s) => (s.length > 140 ? s.slice(0, 140) + "…" : s);

async function trySend(fn) {
  try { await fn(); } catch (e) { console.error("Falha ao enviar e-mail de notificação:", e.message); }
}

const { sendError } = require("../utils/responseHelper");
const warn = (req, res, info, url, status = 500) =>
  sendError(req, res, info, "warning", {}, status, url);

module.exports = {
  // ---------------- USUÁRIO ----------------

  // GET /account/tickets
  listMine: async (req, res) => {
    try {
      const tickets = await Ticket.find({ user: req.session.user.id }).sort({ lastMessageAt: -1 }).lean();
      // marca quantas mensagens do admin estão não lidas por ticket
      for (const t of tickets) {
        t.unread = await TicketMessage.countDocuments({ ticket: t._id, senderType: "admin", read: false });
      }
      res.render("ticketsList", { tickets, isAdmin: false });
    } catch (e) { warn(req, res, e.message, "/account"); }
  },

  // POST /account/tickets  (abre novo ticket)
  create: async (req, res) => {
    try {
      const subject = (req.body.subject || "").trim();
      const body = (req.body.body || "").trim();
      if (!subject || !body) return res.redirect("/account/tickets");

      const u = req.session.user;
      const ticket = await Ticket.create({
        user: u.id, userName: u.name, userEmail: u.email,
        subject: subject.slice(0, 140), lastMessageAt: new Date()
      });
      await TicketMessage.create({ ticket: ticket._id, senderType: "user", body: body.slice(0, 4000) });

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

      const messages = await TicketMessage.find({ ticket: ticket._id }).sort({ createdAt: 1 }).lean();
      // mensagens do admin viram lidas + limpa notificações deste ticket
      await TicketMessage.updateMany({ ticket: ticket._id, senderType: "admin", read: false }, { read: true });
      await Notification.updateMany({ recipientType: "user", recipientId: req.session.user.id, link: `/account/tickets/${ticket._id}`, read: false }, { read: true });

      res.render("ticketThread", {
        ticket, messages, isAdmin: false,
        replyUrl: `/account/tickets/${ticket._id}/reply`,
        backUrl: "/account/tickets"
      });
    } catch (e) { warn(req, res, e.message, "/account/tickets"); }
  },

  // POST /account/tickets/:id/reply
  replyMine: async (req, res) => {
    try {
      const body = (req.body.body || "").trim();
      const ticket = await Ticket.findOne({ _id: req.params.id, user: req.session.user.id });
      if (!ticket) return warn(req, res, "Conversa não encontrada.", "/account/tickets", 404);
      if (!body) return res.redirect(`/account/tickets/${ticket._id}`);

      const newMessage = await TicketMessage.create({ ticket: ticket._id, senderType: "user", body: body.slice(0, 4000) });
      ticket.lastMessageAt = new Date();
      if (ticket.status === "closed") ticket.status = "open";
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
      for (const t of tickets) {
        t.unread = await TicketMessage.countDocuments({ ticket: t._id, senderType: "user", read: false });
      }
      res.render("ticketsList", { tickets, isAdmin: true });
    } catch (e) { warn(req, res, e.message, "/admin/dashboard"); }
  },

  // GET /admin/dashboard/tickets/:id
  adminThread: async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id).lean();
      if (!ticket) return warn(req, res, "Conversa não encontrada.", "/admin/dashboard/tickets", 404);

      const messages = await TicketMessage.find({ ticket: ticket._id }).sort({ createdAt: 1 }).lean();
      await TicketMessage.updateMany({ ticket: ticket._id, senderType: "user", read: false }, { read: true });
      await Notification.updateMany({ recipientType: "admin", link: `/admin/dashboard/tickets/${ticket._id}`, read: false }, { read: true });

      res.render("ticketThread", {
        ticket, messages, isAdmin: true,
        replyUrl: `/admin/dashboard/tickets/${ticket._id}/reply`,
        backUrl: "/admin/dashboard/tickets"
      });
    } catch (e) { warn(req, res, e.message, "/admin/dashboard/tickets"); }
  },

  // POST /admin/dashboard/tickets/:id/reply
  adminReply: async (req, res) => {
    try {
      const body = (req.body.body || "").trim();
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) return warn(req, res, "Conversa não encontrada.", "/admin/dashboard/tickets", 404);
      if (!body) return res.redirect(`/admin/dashboard/tickets/${ticket._id}`);

      const newMessage = await TicketMessage.create({ ticket: ticket._id, senderType: "admin", body: body.slice(0, 4000) });
      ticket.lastMessageAt = new Date();
      await ticket.save();

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

      if (req.app.get('io')) {
        req.app.get('io').to(`ticket_${ticket._id}`).emit('ticket:message:added', { ticketId: ticket._id, message: newMessage });
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
