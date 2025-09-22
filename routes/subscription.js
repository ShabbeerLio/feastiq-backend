const express = require("express");
const router = express.Router();
const {
  assignSubscription,
  checkSubscription,
  unsubscribe,
} = require("../controllers/subscriptionControllers");
const User = require("../models/User");
var fetchuser = require("../middleware/fetchUser");

// const startSubscriptionCron = require("../controllers/checkSubcriptions");

// Assign/Update subscription (with coupon optional)
router.post("/assign", fetchuser, assignSubscription);

// Check subscription status
router.get("/status", fetchuser, checkSubscription);

// startSubscriptionCron();

// Unsubscribe
router.post("/unsubscribe", fetchuser, unsubscribe);

// GET /api/subscription/check-expiry
// Admin or cron job can call this to send notifications for expiring subscriptions
router.get("/check-expiry", async (req, res) => {
  try {
    const today = new Date();
    const users = await User.find({ "subscription.status": "Active" });

    for (const user of users) {
      if (user.subscription.endDate) {
        const end = new Date(user.subscription.endDate);
        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) { 
          console.log(
            `Sending notification to ${user.name} (${user.email}) — ${diffDays} day(s) left`
          );
        }

        // if (diffDays <= 3 && user.pushToken) { // notify 3 days before expiry
        //   await sendPushNotification(
        //     user.pushToken,
        //     "Subscription Expiring Soon",
        //     `Hi ${user.name}, your ${user.subscription.plan} subscription expires in ${diffDays} day(s).`,
        //     { link: "https://feastiq.online/account" }
        //   );
        // }
      }
    }

    res.json({ success: true, message: "Notifications sent for expiring subscriptions" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;