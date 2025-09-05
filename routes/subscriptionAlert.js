const express = require("express");
const router = express.Router();
const User = require("../models/User");
const sendSubscriptionAlert = require("../utils/sendSubscriptionAlert");

router.get("/check-ending", async (req, res) => {
  try {
    const today = new Date();
    const maxAlertDate = new Date();
    maxAlertDate.setDate(today.getDate() + 3); // 3 days ahead

    const users = await User.find({
      "subscription.status": "Active",
      "subscription.endDate": { $gte: today, $lte: maxAlertDate },
    });

    users.forEach((user) => {
      const endDate = new Date(user.subscription.endDate);
      const diffTime = endDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert ms to days

      // Send email
      sendSubscriptionAlert(
        user.email,
        user.name,
        user.subscription.plan,
        daysLeft
      );
    });

    res.json({
      success: true,
      message: "Alerts processed",
      count: users.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
