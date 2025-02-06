const UUID = require('uuid').v4;
const { DateTime } = require('luxon');
const MessageDB = require("../db/messageDB")

module.exports = {

  submitMessage: async (req, res) => {
    const { email, phone, name, messenger } = req.body;

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
    res.status(201).render("alertSuccessMessage");
  }
}