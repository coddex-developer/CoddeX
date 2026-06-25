const mongoose = require("mongoose");
const { Schema } = mongoose;

const ticketSchema = new Schema({
  user: { type: String, required: true, ref: "User" },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  subject: { type: String, required: true },
  category: { type: String, default: "Geral" },
  status: { type: String, enum: ["pending", "in_progress", "resolved", "closed", "open"], default: "pending" },
  priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
  assignee: { type: String, ref: "User", default: null },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

ticketSchema.index({ user: 1, lastMessageAt: -1 });
ticketSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("Ticket", ticketSchema);
