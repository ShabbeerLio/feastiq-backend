const express = require("express");
const router = express.Router();
const {
  assignSubscription,
  checkSubscription,
  unsubscribe,
} = require("../controllers/subscriptionControllers");
var fetchuser = require("../middleware/fetchUser");
// const startSubscriptionCron = require("../controllers/checkSubcriptions");

// Assign/Update subscription (with coupon optional)
router.post("/assign", fetchuser, assignSubscription);

// Check subscription status
router.get("/status", fetchuser, checkSubscription);

// startSubscriptionCron();

// Unsubscribe
router.post("/unsubscribe", fetchuser, unsubscribe);

module.exports = router;