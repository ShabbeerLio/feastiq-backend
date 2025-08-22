const express = require("express");
const router = express.Router();
const Detail = require("../models/Detail");
var fetchuser = require("../middleware/fetchUser");
const User = require("../models/User");
const { body, validationResult } = require("express-validator");

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

// route2 : Add new category using POST: "/api/detail/adddetail" login required
router.post("/addfeast", fetchuser, async (req, res) => {
  try {
    const { age, weight, height, gender, goal, dailyFoods } = req.body;
    const prompt = `
You are a certified fitness and nutrition coach. Create a personalized fitness and nutrition plan for the following person:

Age: ${age}
Gender: ${gender}
Weight: ${weight} kg
Height: ${height} cm
Goal: ${goal}
Daily Food Intake: ${dailyFoods}

Your response must be a SINGLE JSON object only (no extra text or markdown).  

⚠️ IMPORTANT RULES:  
- All 7 days (Monday → Sunday) must be completely filled with unique meals and workouts.  
- Do not leave ANY object or array empty.  
- Every meal must include: time, meal name, calories, protein, carbs, fats, and recipes (with title, ingredients including macros, and steps).  
- Every workout day must include at least 3 exercises (with calories, protein, carbs, fats).  
- The JSON must be valid and properly formatted.  

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
     - calories (number) 

4. motivationalTip — string  

5. importantConsiderations — array of strings  
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

// PUT: "/api/detail/admin/editdetail/:userId" - Admin only
router.put("/editdetail/:userId", fetchuser, isAdmin, async (req, res) => {
  try {
    const { mealFitness } = req.body;

    const targetUserId = req.params.userId;

    // Check if a detail document already exists for this user
    let existingDetail = await Detail.findOne({ user: targetUserId });

    // Create new if not exists
    if (!existingDetail) {
      existingDetail = new Detail({ user: targetUserId });
    }

    existingDetail.mealFitness = mealFitness;
    const savedDetail = await existingDetail.save();
    res.json({ success: true, detail: savedDetail });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
