const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema({
  // "admin" para o dono do site; "user" para um usuário específico
  recipientType: { type: String, enum: ["admin", "user"], required: true },
  recipientId: { type: String, default: "admin" }, // userId quando for "user"
  type: { type: String, default: "info" },         // new_user, new_message, reply...
  category: { type: String, enum: ["ticket", "comment", "system", "mention"], default: "system" },
  actorName: { type: String, default: "Sistema" },
  actorAvatar: { type: String, default: "" },
  text: { type: String, required: true },
  link: { type: String, default: "/" },
  read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipientType: 1, recipientId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
