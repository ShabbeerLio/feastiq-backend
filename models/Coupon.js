const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["subscription", "cart"],
    required: true,
  },
  discount: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
  },
  status: {
    type: String,
    enum: ["enable", "disabled"],
    default: "enable",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Coupon", CouponSchema);
