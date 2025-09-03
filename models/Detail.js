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

const WorkoutSchema = new Schema({
  type: { type: String }, // e.g. Running, Gym, Yoga
  caloriesBurned: { type: Number, default: 0 },
  duration: { type: Number }, // optional: in minutes
  status: { type: String }, // completed / planned
});

const DailyMealSchema = new Schema({
  date: { type: Date, required: true }, // which day
  meals: [MealSchema], // list of meals that day
  workouts: [WorkoutSchema],
  totals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    burned: { type: Number, default: 0 }, // ✅ total burned
    netCalories: { type: Number, default: 0 },
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
