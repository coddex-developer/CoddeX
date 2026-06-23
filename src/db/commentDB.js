const mongoose = require("mongoose");
const { Schema } = mongoose;

const commentSchema = new Schema({
  user: { type: String, required: true, ref: "User" },
  userName: { type: String, required: true }, // desnormalizado para exibir sem join
  project: { type: String, required: true, ref: "ProjectsDB" },
  body: { type: String, required: true } // markdown (sanitizado na renderização)
}, { timestamps: true });

commentSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
