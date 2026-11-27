const mongoose = require("mongoose");
const { Schema } = mongoose;

const User = mongoose.model("User", new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  verified: { type: Boolean, default: false },
  verifyToken: String,
  resetToken: String,
  resetExpires: Date,
}, { timestamps: true }));

// One document per ingredient. category: base | sauce | cheese | vegetable
const Ingredient = mongoose.model("Ingredient", new Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ["base", "sauce", "cheese", "vegetable"], required: true },
  price: { type: Number, required: true },      // INR per pizza
  stock: { type: Number, required: true },      // units left
  threshold: { type: Number, default: 20 },     // low-stock level
  alerted: { type: Boolean, default: false },   // low-stock alert already raised
}));

const Alert = mongoose.model("Alert", new Schema({
  ingredient: String, stock: Number, threshold: Number,
  emailSent: Boolean, note: String, resolved: { type: Boolean, default: false },
}, { timestamps: true }));

const Order = mongoose.model("Order", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items: [{ base: String, sauce: String, cheese: String, vegetables: [String], quantity: Number, unitPrice: Number }],
  total: { type: Number, required: true },
  address: String,
  status: { type: String, enum: ["received", "in_kitchen", "sent_to_delivery"], default: "received" },
  // payment: pending (awaiting Razorpay) | paid (signature verified) | unpaid_demo (no Razorpay, not paid) | failed
  payment: { type: String, enum: ["pending", "paid", "unpaid_demo", "failed"], default: "pending" },
  razorpayOrderId: String, razorpayPaymentId: String,
  stockApplied: { type: Boolean, default: false },
}, { timestamps: true }));

module.exports = { User, Ingredient, Alert, Order };
