const mongoose = require("mongoose");
const { Schema } = mongoose;

const likeSchema = new Schema({
  user: { type: String, required: true, ref: "User" },
  project: { type: String, required: true, ref: "ProjectsDB" }
}, { timestamps: true });

// Um usuário só pode curtir um projeto uma vez
likeSchema.index({ user: 1, project: 1 }, { unique: true });

module.exports = mongoose.model("Like", likeSchema);
