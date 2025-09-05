const mongoose = require("mongoose");
const { Schema } = mongoose;

const AdminNoticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: "user", default: null },
  isGlobal: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

const planSchema = new mongoose.Schema({
  plan: { type: String },
  price: { type: String },
  slprice: { type: String },
});

const AdminDetailSchema = new Schema({
  plan: [planSchema],
  Notice: [AdminNoticeSchema],
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("adminDetail", AdminDetailSchema);
