require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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

// Gera o hash da senha sempre que ela for definida/alterada
Admin.pre("save", async function (next) {
  if (!this.isModified("passAdmin")) return next();
  this.passAdmin = await bcrypt.hash(this.passAdmin, 10);
  next();
});

module.exports = mongoose.model("Admin", Admin);
