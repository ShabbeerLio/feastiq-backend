const express = require("express");
const router = express.Router();
const Detail = require("../models/Detail");
var fetchuser = require("../middleware/fetchUser");
const User = require("../models/User");
const { body, validationResult } = require("express-validator");
const OpenAI = require("openai");

// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

// route3 : Admin can get all users' details using GET: "/api/detail/fetchalluserdetails"
router.get("/fetchalluserdetails", fetchuser, isAdmin, async (req, res) => {
  try {
    const allDetails = await Detail.find(); // fetch all user details
    res.json(allDetails);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

// route3 : Admin can get a specific user's details using GET: "/api/detail/fetchuserdetails/:userId"
router.get(
  "/fetchuserdetails/:userId",
  fetchuser,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Find details for the specific user
      const userDetails = await Detail.find({ user: userId });

      if (!userDetails || userDetails.length === 0) {
        return res.status(404).json({ message: "User details not found" });
      }

      res.json(userDetails);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  }
);

// route1 : Get all category using GET: "api/detail/fetchfeast" login required
router.get("/fetchfeast", fetchuser, async (req, res) => {
  try {
    const clients = await Detail.find({ user: req.user.id });
    res.json(clients);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

// router.post("/addfeast", fetchuser, async (req, res) => {
//   const client = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY, // set in .env
//   });

//   try {
//     const { age, weight, height, gender, goal, foodpreferences } = req.body;
//     console.log(age, weight, height, gender, goal, foodpreferences, "items");

//     const prompt = `
// You are a certified fitness and nutrition coach. Create a personalized fitness and nutrition plan for the following person:

// Age: ${age}
// Gender: ${gender}
// Weight: ${weight} kg
// Height: ${height} cm
// Goal: ${goal}
// Daily Food Intake: ${foodpreferences}

// Your response must be a SINGLE JSON object only (no extra text or markdown).

// ⚠️ IMPORTANT RULES:
// - All 7 days (Monday → Sunday) must be completely filled with unique meals and workouts.
// - Do not leave ANY object or array empty.
// - Every meal must include: time, meal name, calories, protein, carbs, fats, and recipes (with title, ingredients including macros, and steps).
// - **The calorie breakdown must be calculated correctly, and the sum of calories for breakfast, lunch, dinner, and snacks for each day MUST add up to the total daily calorie target.**
// - Every workout day must include at least 3 exercises (with calories, protein, carbs, fats).
// - The JSON must be valid and properly formatted.

// The JSON must include these keys:

// 1. calorieBreakdown — object with keys: calories, protein, carbs, fats.

// 2. mealPlan — array of 7 objects (one per day). Each day object must have:
//    - day (string)
//    - breakfast, lunch, dinner, snacks — each is an object with:
//      - time (string)
//      - meal (string)
//      - calories (number)
//      - protein (number)
//      - carbs (number)
//      - fats (number)
//      - recipes (array of objects, each with:
//        - title (string)
//        - ingredients (array of strings, each showing food + macros like “1 cup oats (300 kcal, 10g protein, 55g carbs, 6g fat)”)
//        - steps (array of strings))

// 3. workoutPlan — array of 7 objects, each with:
//    - day (string)
//    - exercises (array of objects, each with:
//      - name (string)
//      - calories (number)

// 4. motivationalTip — string

// 5. importantConsiderations — array of strings
// `;

//     // Call OpenAI API
//     const response = await client.chat.completions.create({
//       model: "gpt-4o-mini", // or "gpt-4o" for higher quality
//       messages: [{ role: "user", content: prompt }],
//       response_format: { type: "json_object" }, // forces valid JSON
//     });

//     const planText = response.choices[0].message.content;

// Check if a detail document already exists for this user
//     let existingDetail = await Detail.findOne({ user: req.user.id });
//     // Create new if not exists
//     if (!existingDetail) {
//       existingDetail = new Detail({ user: req.user.id });
//     }
//     existingDetail.mealFitness = planText;
//     const savedDetail = await existingDetail.save();
//     res.json(savedDetail);
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send("Internal Server Error");
//   }
// });

// gemini API key

// route2 : Add new category using POST: "/api/detail/adddetail" login required
router.post("/addfeast", fetchuser, async (req, res) => {
  try {
    const { age, weight, height, gender, goal, foodpreferences } = req.body;
    console.log(age, weight, height, gender, goal, foodpreferences, "items");
    const prompt = `
You are a certified fitness and nutrition coach. Create a personalized fitness and nutrition plan for the following person:

Age: ${age}
Gender: ${gender}
Weight: ${weight} kg
Height: ${height} cm
Goal: ${goal}
Daily Food Intake: ${foodpreferences}

Your response must be a SINGLE JSON object only (no extra text or markdown).

⚠️ IMPORTANT RULES:
- All 7 days (Monday → Sunday) must be completely filled with unique meals and workouts.
- Do not leave ANY object or array empty.
- Every meal must include: time, meal name, calories, protein, carbs, fats, and recipes (with title, ingredients including macros, and steps).
- **The calorie breakdown must be calculated correctly, and the sum of calories for breakfast, lunch, dinner, and snacks for each day MUST add up to the total daily calorie target.**
- Every workout day must include at least 3 exercises (with calories).
- The JSON must be valid and properly formatted.

CALCULATION RULES FOR WEIGHT CHANGE PROJECTION (MUST BE APPLIED):
- Use 7700 kcal = 1 kg body weight (i.e., 7700 kcal deficit = ~1 kg lost; 7700 kcal surplus = ~1 kg gained).
- Determine 'dailySurplusDeficit' = (dailyCaloriesProvidedByPlan - dailyCalorieMaintenanceEstimate).
- If user did not provide an explicit daily calorie maintenance estimate, calculate maintenance using Mifflin-St Jeor (or a reasonable population average) and include the formula and resulting number inside the JSON under 'weightChangeProjection.assumptions'.
  - Mifflin-St Jeor (for men): BMR = 10*kg + 6.25*cm - 5*age + 5
  - Mifflin-St Jeor (for women): BMR = 10*kg + 6.25*cm - 5*age - 161
  - Multiply BMR by an activity factor. If user's activity level isn't provided, assume "moderately active" (activity factor = 1.55) and state that assumption.
- Raw estimate: estimatedDaysRaw = abs((targetWeight - currentWeight) * 7700 / dailySurplusDeficit) if targetWeight is implicit from ${goal} (e.g., "lose 5 kg") or compute for ±1 kg steps if target unspecified. If dailySurplusDeficit is 0, set estimatedDaysRaw = "infinite (no deficit/surplus)".
- Safety-adjusted estimate: constrain the rate of weight change to safe ranges.
  - For weight loss, safe rate = 0.25 to 1.0 kg/week (prefer mid-range 0.5 kg/week). For weight gain, safe rate = 0.25 to 0.75 kg/week.
  - If raw calculation implies > 1.0 kg/week (loss) or >0.75 kg/week (gain) or <0.25 kg/week, provide an adjusted estimate by recalculating using a safe daily deficit/surplus corresponding to 0.5 kg/week (i.e., ~550 kcal/day deficit) for loss or 0.35 kg/week (~ 270 kcal/day surplus) for gain. Present both raw and adjusted estimates.
- Always include units, rounding to one decimal place for kg and whole days for days, and provide the formulas used in assumptions.

The JSON must include these keys:

1. calorieBreakdown — object with keys: calories, protein, carbs, fats.

2. mealPlan — array of 7 objects (one per day). Each day object must have:
   - day (string)
   - breakfast, lunch, dinner, snacks — each is an object with:
     - time (string)
     - meal (string)
     - calories (number)
     - protein (number)
     - carbs (number)
     - fats (number)
     - recipes (array of objects, each with:
       - title (string)
       - ingredients (array of strings, each showing food + macros like “1 cup oats (300 kcal, 10g protein, 55g carbs, 6g fat)”)
       - steps (array of strings))

3. workoutPlan — array of 7 objects, each with:
   - day (string)
   - exercises (array of objects, each with:
     - name (string)
     - calories (number))

4. motivationalTip — string

5. importantConsiderations — array of strings

6. weightChangeProjection — object with the following required fields:
   - currentWeight (number, kg)
   - targetWeight (number, kg) — if ${goal} specifies an amount (e.g., "lose 5 kg") use it; otherwise set to null.
   - dailyCalorieTarget (number, kcal) — the average daily calories from the mealPlan.
   - dailyCalorieMaintenanceEstimate (number, kcal) — the maintenance calories used for calculations (show formula in assumptions).
   - dailySurplusDeficit (number, kcal) — dailyCalorieTarget - dailyCalorieMaintenanceEstimate (positive for surplus, negative for deficit).
   - estimatedDaysRaw (number|string) — the raw estimated days to reach the target (or "infinite" if no surplus/deficit). Round to nearest whole day.
   - estimatedDaysAdjusted (number|string) — the safety-adjusted estimate (using safe weekly rates described above). Round to nearest whole day.
   - weeklyRateKgRaw (number) — implied raw kg per week (signed; negative for loss). One decimal place.
   - weeklyRateKgAdjusted (number) — safety adjusted kg per week (signed). One decimal place.
   - assumptions (array of strings) — list the formulas, constants (7700 kcal/kg), activity factor used, any assumptions such as "assumed moderately active (1.55)" or clinical cautions.
   - note (string) — short safety note if raw estimate exceeds safe ranges, otherwise empty string.

ADDITIONAL JSON RULES:
- The 'weightChangeProjection' values must be consistent with the mealPlan calorie totals (dailyCalorieTarget should be the average of the 7 day totals).
- If the user's ${goal} is ambiguous (e.g., "tone" or "maintain weight"), output estimatedDaysRaw and estimatedDaysAdjusted for ±1 kg and state that targetWeight is null.
- All numeric values must be numbers (not strings), except where the spec allows a string like "infinite".
- Provide both raw math and the safety-adjusted result in the JSON (do not output any extra text outside the JSON).

EXTRA:
- If the raw dailySurplusDeficit is very large (>1500 kcal/day) or implies >2.0 kg/week, include a safety flag in 'weightChangeProjection.assumptions' recommending medical supervision.

The JSON must be the only output — no commentary, no explanation, and no markdown. Ensure valid JSON.

`;

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res
        .status(500)
        .json({ error: "Gemini API failed to return a plan" });
    }

    const planText = geminiData.candidates[0].content.parts[0].text;

    // Check if a detail document already exists for this user
    let existingDetail = await Detail.findOne({ user: req.user.id });
    // Create new if not exists
    if (!existingDetail) {
      existingDetail = new Detail({ user: req.user.id });
    }
    existingDetail.mealFitness = planText;
    const savedDetail = await existingDetail.save();
    res.json(savedDetail);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

// ------------------- DailyMeals CRUD -------------------

// 1️⃣ GET all dailyMeals
router.get("/dailyMeals", fetchuser, async (req, res) => {
  try {
    const detail = await Detail.findOne({ user: req.user.id });
    if (!detail) return res.status(404).json({ error: "No details found" });

    res.json(detail.dailyMeals);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

// 2️⃣ POST - Add meals or workouts to dailyMeals
router.post("/dailyMeals", fetchuser, async (req, res) => {
  try {
    const { date, meals = [], workouts = [] } = req.body;

    // normalize date (ignore time part)
    const mealDate = new Date(date).toISOString().split("T")[0];

    let detail = await Detail.findOne({ user: req.user.id });
    if (!detail) detail = new Detail({ user: req.user.id });

    // Check if dailyMeal already exists for that date
    let dailyMeal = detail.dailyMeals.find(
      (dm) => dm.date.toISOString().split("T")[0] === mealDate
    );

    if (dailyMeal) {
      // Append new meals & workouts
      dailyMeal.meals.push(...meals);
      dailyMeal.workouts.push(...workouts);
    } else {
      detail.dailyMeals.push({
        date: new Date(date),
        meals,
        workouts,
      });
      dailyMeal = detail.dailyMeals[detail.dailyMeals.length - 1];
    }

    // ✅ Recalculate totals only from completed meals
    const totalsFromMeals = dailyMeal.meals
      .filter((m) => m.status === "completed")
      .reduce(
        (acc, m) => {
          acc.calories += m.calories || 0;
          acc.protein += m.protein || 0;
          acc.fats += m.fats || 0;
          acc.carbs += m.carbs || 0;
          return acc;
        },
        { calories: 0, protein: 0, fats: 0, carbs: 0 }
      );

    // ✅ Calculate burned calories from workouts
    const totalBurned = dailyMeal.workouts
      .filter((w) => w.status === "completed")
      .reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

    dailyMeal.totals = {
      ...totalsFromMeals,
      burned: totalBurned,
      netCalories: totalsFromMeals.calories - totalBurned, // ✅ net
    };

    await detail.save();
    res.json(detail.dailyMeals);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

// 3️⃣ PUT - Update a dailyMeal by ID
router.put("/dailyMeals/:id", fetchuser, async (req, res) => {
  try {
    const { date, meals, totals } = req.body;

    const detail = await Detail.findOne({ user: req.user.id });
    if (!detail) return res.status(404).json({ error: "No details found" });

    const dailyMeal = detail.dailyMeals.id(req.params.id);
    if (!dailyMeal)
      return res.status(404).json({ error: "DailyMeal not found" });

    if (date) dailyMeal.date = date;
    if (meals) dailyMeal.meals = meals;
    if (totals) dailyMeal.totals = totals;

    await detail.save();
    res.json(dailyMeal);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

// 4️⃣ DELETE - Remove a dailyMeal by ID
router.delete("/dailyMeals/:id", fetchuser, async (req, res) => {
  try {
    const detail = await Detail.findOne({ user: req.user.id });
    if (!detail) return res.status(404).json({ error: "No details found" });

    const dailyMeal = detail.dailyMeals.id(req.params.id);
    if (!dailyMeal)
      return res.status(404).json({ error: "DailyMeal not found" });

    dailyMeal.remove();
    await detail.save();

    res.json({ success: true, msg: "DailyMeal deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
