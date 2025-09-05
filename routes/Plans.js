const express = require("express");
const router = express.Router();
const AdminDetail = require("../models/AdminDetail");
const User = require("../models/User");
const fetchUser = require("../middleware/fetchUser");

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

// Route to add a plan detail (Admin only) /api/plan/add
router.post("/add", fetchUser, isAdmin, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({ message: "plan is required" });
    }
    let adminDetail = await AdminDetail.findOne();

    if (!adminDetail) {
      adminDetail = new AdminDetail({ plan });
    } else {
      adminDetail.plan.push(...plan);
    }

    await adminDetail.save();
    res.status(201).json({ message: "plan added successfully", adminDetail });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Route to fetch all details (Accessible to all users) /api/plan/all
router.get("/all", async (req, res) => {
  try {
    const details = await AdminDetail.find().sort({ date: -1 });
    res.status(200).json(details);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Route to edit a specific plan entry (Admin only) /api/plan/edit/:id
router.put("/edit/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedplan = req.body;

    let adminDetail = await AdminDetail.findOne();
    if (!adminDetail) {
      return res.status(404).json({ message: "Admin details not found" });
    }

    const planIndex = adminDetail.plan.findIndex(
      (g) => g._id.toString() === id
    );
    if (planIndex === -1) {
      return res.status(404).json({ message: "plan entry not found" });
    }

    adminDetail.plan[planIndex] = {
      ...adminDetail.plan[planIndex]._doc,
      ...updatedplan,
    };
    await adminDetail.save();

    res
      .status(200)
      .json({ message: "plan updated successfully", adminDetail });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Route to delete a specific plan entry (Admin only) /api/plan/delete/:id
router.delete("/delete/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let adminDetail = await AdminDetail.findOne();
    if (!adminDetail) {
      return res.status(404).json({ message: "Admin details not found" });
    }

    const initialLength = adminDetail.plan.length;
    adminDetail.plan = adminDetail.plan.filter(
      (g) => g._id.toString() !== id
    );

    if (initialLength === adminDetail.plan.length) {
      return res.status(404).json({ message: "plan entry not found" });
    }

    await adminDetail.save();
    res
      .status(200)
      .json({ message: "plan deleted successfully", adminDetail });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;