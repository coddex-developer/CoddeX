const UUID = require('uuid').v4;
const { DateTime } = require('luxon');
const MessageDB = require("../db/messageDB");
const Notification = require("../db/notificationDB");
const SiteConfig = require("../db/siteConfigDB");
const { notifyAdminNewMessage } = require("../utils/mailer");

module.exports = {

  submitMessage: async (req, res) => {
    try {
      const { email, phone, name, messenger } = req.body;

      if (!email || !phone || !name || !messenger) {
        return res.status(400).render("warning", {
          title: "Campos incompletos", icon: "warning",
          info: "Preencha todos os campos do formulário.",
          textButton: "Voltar", url: "/#contato"
        });
      }

      const brTime = DateTime.now().setZone('America/Sao_Paulo');
      const message = new MessageDB({
        _id: UUID(),
        time: brTime.toFormat('HH:mm:ss'),
        name, email, phone,
        data: brTime.toFormat('dd/MM/yyyy'),
        content: messenger,
        completed: false
      });
      await message.save();

      // Notifica o admin (painel + e-mail) sobre a nova mensagem de contato
      const link = `/admin/dashboard/messages/${message._id}`;
      try {
        await Notification.create({
          recipientType: "admin", recipientId: "admin", type: "new_message",
          text: `Nova mensagem de contato de ${name}`, link
        });
        const site = await SiteConfig.getSingleton();
        const panelUrl = `${req.protocol}://${req.get("host")}${link}`;
        await notifyAdminNewMessage(site.contactEmail, name, "Contato pelo site", messenger, panelUrl);
      } catch (e) {
        console.error("Falha ao notificar admin (contato):", e.message);
      }

      res.render("warning", {
        title: "Sucesso!", icon: "success",
        info: "Sua mensagem foi enviada, em breve entraremos em contato!",
        textButton: "Ok", url: "/"
      });
    } catch (error) {
      res.status(500).render("warning", {
        title: "Aviso!", icon: "error",
        info: error.message, textButton: "Voltar", url: "/#contato"
      });
    }
  }
};
