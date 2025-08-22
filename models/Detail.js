const mongoose = require("mongoose");
const { Schema } = mongoose;

const DetailSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  mealFitness:{
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("detail", DetailSchema);
