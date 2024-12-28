const UUID = require('uuid').v4;
const messengers = require('../models/smsModel');
const { DateTime } = require('luxon');

module.exports = {

  submiteMessage: (req, res) => {
    const { email, phone, name, messenger } = req.body;

    const brTime = DateTime.now().setZone('America/Sao_Paulo');

    const message = {
      id: UUID(),
      time: brTime.toFormat('HH:mm:ss'),
      name,
      email,
      phone,
      data: brTime.toFormat('dd/MM/yyyy'),
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