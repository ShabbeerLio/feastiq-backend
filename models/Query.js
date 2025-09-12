const mongoose = require("mongoose");
const { Schema } = mongoose;

const QueryRequestSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  number: { type: String, required: true },
  question: { type: String, required: true }, // e.g. "payment", "account"
  description: { type: String, required: true },

  // Admin response
  answer: { type: String, default: "" },
  status: { type: String, enum: ["pending", "answered"], default: "pending" },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QueryRequest", QueryRequestSchema);