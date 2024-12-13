const UUID = require('uuid').v4;
const messengers = require('../models/smsModel');

module.exports = {

  submiteMessage: (req, res) => {
    const { email, phone, name, messenger } = req.body;
    const horas = new Date().getHours();
    const minutos = new Date().getMinutes();
    const segundos = new Date().getSeconds();
    const dia = String(new Date().getDate()).padStart(2, '0');
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const ano = new Date().getFullYear();

    const message = {
      id: UUID(),
      time: `${horas}:${minutos}:${segundos}`,
      name,
      email,
      phone,
      data: `${dia}/${mes}/${ano}`,
      content: messenger,
      completed: false
    };

    messengers.unshift(message);
    res.status(201).render("alertSuccessMessage");
  },

  getMessages: () => {
    return messengers;
  }
}