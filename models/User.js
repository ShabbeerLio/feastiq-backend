const mongoose = require("mongoose");
const { Schema } = mongoose;

const WeightHistorySchema = new mongoose.Schema({
  weight: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Invoice Schema
const InvoiceSchema = new Schema({
  type: {
    type: String,
  },
  plan: {
    type: String,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  price: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Generate a unique invoice number before saving
InvoiceSchema.pre("save", function (next) {
  this.invoiceNumber = `INV-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
  next();
});

const CouponSchema = new Schema({
  code: {
    type: String,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
});

const SubscriptionSchema = new Schema({
  plan: {
    type: String,
    enum: ["Free", "Basic", "Premium", "Enterprise"],
    default: "Free",
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["Active", "Expired", "Cancelled"],
    default: "Active",
  },
  paymentMethod: {
    type: String,
  },
  transactionId: {
    type: String,
  },
  appliedCoupon: CouponSchema,
});

const SubscriptionHistorySchema = new Schema({
  plan: String,
  startDate: Date,
  endDate: Date,
  paymentMethod: String,
  transactionId: String,
  appliedCoupon: {
    code: String,
    discount: Number,
  },
  status: String,
  date: {
    type: Date,
    default: Date.now,
  },
});

const UserSchema = new Schema({
  role: {
    type: String,
    enum: ["user"],
    default: "user",
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  googleId: {
    type: String,
  },
  age: {
    type: String,
    // required: true,
  },
  gender: {
    type: String,
    // required: true,
  },
  weight: {
    type: Number,
    // required: true,
  },
  height: {
    type: String,
  },
  goal: {
    type: String,
  },
  foodpreferences: {
    type: String,
  },
  weightHistory: [WeightHistorySchema],
  subscription: { type: SubscriptionSchema, default: {} },
  subscriptionHistory: [SubscriptionHistorySchema],
  invoices: [InvoiceSchema],
  date: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre("save", function (next) {
  next();
});

const User = mongoose.model("user", UserSchema);

module.exports = User;
