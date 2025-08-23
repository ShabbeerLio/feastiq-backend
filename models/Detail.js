const mongoose = require("mongoose");
const { Schema } = mongoose;

const MealSchema = new Schema({
  type: { type: String, required: true }, // Breakfast, Lunch, Dinner
  meal: [{ type: String }], // food items
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  status: { 
    type: String, 
  },
});

const DailyMealSchema = new Schema({
  date: { type: Date, required: true }, // which day
  meals: [MealSchema], // list of meals that day
  totals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
  },
});

const DetailSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // stays same always
   mealFitness: {
    type: Object,
  },

  dailyMeals: [DailyMealSchema],  

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Detail", DetailSchema);