const mongoose = require("mongoose");
const { Schema } = mongoose;

const commentLikeSchema = new Schema({
  user: { type: String, required: true },   // userId ou "admin"
  comment: { type: Schema.Types.ObjectId, required: true, ref: "Comment" }
}, { timestamps: true });

// Um ator só pode curtir um comentário uma vez
commentLikeSchema.index({ user: 1, comment: 1 }, { unique: true });

module.exports = mongoose.model("CommentLike", commentLikeSchema);
