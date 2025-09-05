const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");

// Create new coupon
router.post("/create", async (req, res) => {
  try {
    const { code, type, discount, status } = req.body;
    if (!code || !discount) {
      return res.status(400).json({ error: "Code and discount are required" });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: "Coupon already exists" });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      type,
      discount,
      status,
    });

    await coupon.save();
    res.json({ success: true, coupon });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// List all coupons
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a coupon
router.delete("/:id", async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
router.put("/:id", async (req, res) => {
  try {
    const { code, type, discount, status } = req.body;

    const allowedTypes = ["subscription", "appointment", "cart"];
    const allowedStatuses = ["enable", "disabled"];

    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });

    if (code) {
      const exists = await Coupon.findOne({
        code: code.toUpperCase(),
        _id: { $ne: req.params.id },
      });
      if (exists)
        return res.status(400).json({ error: "Coupon code already in use" });
      coupon.code = code.toUpperCase();
    }

    if (discount !== undefined) coupon.discount = discount;
    if (type) coupon.type = type;
    if (status) coupon.status = status;

    await coupon.save();
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update coupon status only
router.patch("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["enable", "disabled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!coupon) return res.status(404).json({ error: "Coupon not found" });

    res.json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
