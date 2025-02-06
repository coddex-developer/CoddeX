const mongoose = require("mongoose");

const certificateSchema = mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  }
})
  
module.exports = mongoose.model("CertificateDB", certificateSchema);