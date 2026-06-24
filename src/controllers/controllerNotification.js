const Notification = require("../db/notificationDB");
const { sendError } = require("../utils/responseHelper");

module.exports = {
  // GET /notifications/list
  list: async (req, res) => {
    try {
      let recipientType = "user";
      let recipientId = req.session.user ? req.session.user.id : null;

      if (req.session.authenticated) {
        recipientType = "admin";
        recipientId = "admin";
      } else if (!recipientId) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;

      const notifications = await Notification.find({ recipientType, recipientId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      res.json({ notifications });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  // POST /notifications/read-all
  readAll: async (req, res) => {
    try {
      let recipientType = "user";
      let recipientId = req.session.user ? req.session.user.id : null;

      if (req.session.authenticated) {
        recipientType = "admin";
        recipientId = "admin";
      } else if (!recipientId) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      await Notification.updateMany(
        { recipientType, recipientId, read: false },
        { read: true }
      );

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};
