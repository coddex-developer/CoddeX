const mongoose = require("mongoose");
const { Schema } = mongoose;

const ticketMessageSchema = new Schema({
  ticket: { type: Schema.Types.ObjectId, required: true, ref: "Ticket" },
  senderType: { type: String, enum: ["user", "admin"], required: true },
  body: { type: String, required: true }, // markdown (sanitizado na renderização)
  attachments: { type: [Schema.Types.Mixed], default: [] },
  isInternal: { type: Boolean, default: false },
  read: { type: Boolean, default: false }  // lido pelo destinatário
}, { timestamps: true });

ticketMessageSchema.index({ ticket: 1, createdAt: 1 });

module.exports = mongoose.model("TicketMessage", ticketMessageSchema);
