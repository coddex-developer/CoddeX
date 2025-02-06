const mongoose = require("mongoose");

const messageSchema = mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  data: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean
  }
})

module.exports = mongoose.model("MessageDB", messageSchema);