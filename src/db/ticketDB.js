const mongoose = require("mongoose");
const { Schema } = mongoose;

const ticketSchema = new Schema({
  user: { type: String, required: true, ref: "User" },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ["open", "closed"], default: "open" },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

ticketSchema.index({ user: 1, lastMessageAt: -1 });
ticketSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("Ticket", ticketSchema);
