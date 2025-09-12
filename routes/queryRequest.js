const express = require("express");
const router = express.Router();
const QueryRequest = require("../models/Query");
const fetchUser = require("../middleware/fetchUser");
const User = require("../models/User");

// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({ message: "Server error." });
  }
};

// GET /api/query/my
router.get("/my", fetchUser, async (req, res) => {
  try {
    const queries = await QueryRequest.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(queries);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 📌 User submits a query
router.post("/submit", fetchUser, async (req, res) => {
  try {
    const { name, email, number, question, description } = req.body;
    const query = new QueryRequest({
      user: req.user.id,
      name,
      email,
      number,
      question,
      description,
    });
    await query.save();
    res.json({ success: true, query });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/all", fetchUser, isAdmin, async (req, res) => {
  try {
    const queries = await QueryRequest.find(); // fetch all user queries
    res.json(queries);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

// 📌 Admin answers a query
router.put("/answer/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    const { answer } = req.body;
    const query = await QueryRequest.findById(req.params.id);
    if (!query) return res.status(404).json({ error: "Query not found" });

    query.answer = answer;
    query.status = "answered";
    await query.save();

    res.json({ success: true, query });
  } catch (err) {
    console.log(err, "err");
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
