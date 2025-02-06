const mongoose = require("mongoose");

const projectsSchema = mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  imagePj: {
    type: String,
    required: true
  },
  titlePj: {
    type: String,
    required: true
  },
  descriptionPj: {
    type: String,
    required: true
  },
  linkPj: {
    type: String,
    required: true
  }
})
  
module.exports = mongoose.model("ProjectsDB", projectsSchema);