const mongoose = require("mongoose");
const { Schema } = mongoose;

const postSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  coverImage: { type: String, default: "" },
  body: { type: String, required: true }, // markdown (sanitizado na renderização)
  published: { type: Boolean, default: false }
}, { timestamps: true });

postSchema.index({ published: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
