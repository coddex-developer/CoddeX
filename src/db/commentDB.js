const mongoose = require("mongoose");
const { Schema } = mongoose;

const commentSchema = new Schema({
  user: { type: String, required: true },          // userId ou "admin"
  userName: { type: String, required: true },      // desnormalizado para exibir
  userUsername: { type: String, default: null },   // @username
  userAvatar: { type: String, default: null },     // foto de perfil
  isAuthor: { type: Boolean, default: false },     // true quando é o dono do site (admin)
  project: { type: String, required: true, ref: "ProjectsDB" },
  parent: { type: Schema.Types.ObjectId, ref: "Comment", default: null }, // null = comentário raiz
  body: { type: String, required: true }           // markdown (sanitizado na renderização)
}, { timestamps: true });

commentSchema.index({ project: 1, createdAt: -1 });
commentSchema.index({ parent: 1, createdAt: 1 });

module.exports = mongoose.model("Comment", commentSchema);
