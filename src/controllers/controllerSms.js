const UUID = require('uuid').v4;
const { DateTime } = require('luxon');
const MessageDB = require("../db/messageDB")
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "seuemail@gmail.com",
    pass: "suasenha", // Use uma senha de aplicativo se necessário
  },
});

module.exports = {

  submitMessage: async (req, res) => {
    const { email, phone, name, messenger } = req.body;

    const mailOptions = {
      from: "seuemail@gmail.com",
      to: "destinatario@gmail.com",
      subject: "Confirmação de Mensalidade",
      html: `
    <div style="text-align: center; font-family: Arial, sans-serif;">
      <img src="https://seusite.com/minha-logo.png" alt="Logo" width="150">
      <h2>Confirmação de Mensalidade</h2>
      <p>Recebemos sua mensagem! Sua mensalidade está confirmada.</p>
      <a href="https://seusite.com/confirmacao" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
        Confirmar Pagamento
      </a>
    </div>
  `,
    };

    const brTime = DateTime.now().setZone('America/Sao_Paulo');

    const message = new MessageDB({
      _id: UUID(),
      time: brTime.toFormat('HH:mm:ss'),
      name,
      email,
      phone,
      data: brTime.toFormat('dd/MM/yyyy'),
      content: messenger,
      completed: false
    });

    await message.save();
    res.render("warning", {

      title: "Sucesso!",

      info: `Sua solicitação de contato foi enviada, em breve entraremos em contato!
Atenciosamente CoddeX Developer.`,
      textButton: "Ok",
      url: "/"
    })
  }
}