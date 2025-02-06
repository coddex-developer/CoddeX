require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;
const Admin = new Schema({
  userAdmin: {
    type: String,
    required: true,
    default: process.env.ADMIN_USER
  },
  passAdmin: {
    type: String,
    required: true,
    default: process.env.ADMIN_PASS
  },
  role: {
    type: String,
    default: "Admin"
  }
});
module.exports = mongoose.model("Admin", Admin);