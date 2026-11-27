const bcrypt = require("bcryptjs");
const cfg = require("../config");
const { Ingredient, User } = require("../models");
const DEFAULTS = [
  ["Classic Hand-tossed", "base", 150, 50], ["Thin Crust", "base", 140, 50], ["Cheese Burst", "base", 200, 50], ["Whole Wheat", "base", 160, 50], ["Gluten-free", "base", 220, 50],
  ["Tomato Basil", "sauce", 20, 60], ["Spicy Arrabbiata", "sauce", 25, 60], ["Garlic White", "sauce", 30, 60], ["Barbecue", "sauce", 30, 60], ["Pesto", "sauce", 35, 60],
  ["Mozzarella", "cheese", 50, 60], ["Cheddar", "cheese", 45, 60], ["Parmesan", "cheese", 60, 60], ["Vegan Cheese", "cheese", 70, 40],
  ["Onion", "vegetable", 15, 80], ["Capsicum", "vegetable", 20, 80], ["Mushroom", "vegetable", 30, 80], ["Black Olives", "vegetable", 30, 80],
  ["Sweet Corn", "vegetable", 20, 80], ["Tomato", "vegetable", 15, 80], ["Jalapeno", "vegetable", 25, 80],
];
async function seedAdmin() {
  if (!cfg.adminConfigured) { console.log("Admin NOT created: set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in .env."); return; }
  const passwordHash = await bcrypt.hash(cfg.adminPassword, 10);
  await User.findOneAndUpdate({ email: cfg.adminEmail }, { $set: { name: "Admin", passwordHash, role: "admin", verified: true } }, { upsert: true });
  console.log("Admin account ready: " + cfg.adminEmail);
}
async function seed() {
  await seedAdmin();
  if ((await Ingredient.countDocuments()) > 0) return;
  await Ingredient.insertMany(DEFAULTS.map(([name, category, price, stock]) => ({ name, category, price, stock, threshold: 20 })));
  console.log("Seeded " + DEFAULTS.length + " ingredients.");
}
module.exports = { seed };
