require("dotenv").config();
const cron = require("node-cron");
const connectDB = require("../db");
const User = require("../models/User");

const checkSubscriptions = async () => {
  try {
    console.log("Running daily subscription check...");

    const users = await User.find({
      $or: [
        { "subscription.endDate": { $exists: true } },
        { "subscriptionHistory.endDate": { $exists: true } },
      ],
    });

    console.log(users.length, "users found");

    const today = new Date();

    for (let user of users) {
      let modified = false;

      if (user.subscription?.endDate && today > user.subscription.endDate) {
        if (user.subscription.status !== "Expired") {
          user.subscription.status = "Expired";
          modified = true;
          console.log(`Active subscription expired for: ${user.email}`);
        }
      }

      user.subscriptionHistory.forEach((history) => {
        if (history.endDate && today > history.endDate) {
          if (history.status !== "Expired") {
            history.status = "Expired";
            modified = true;
            console.log(`Updated history subscription for: ${user.email}`);
          }
        }
      });

      if (modified) {
        await user.save();
      }
    }

    console.log("Subscription check completed.");
  } catch (err) {
    console.error("Error checking subscriptions:", err);
  }
};

// 🔗 Connect DB before running anything
connectDB().then(() => {
  // Schedule cron job
  cron.schedule("0 0 * * *", () => {
    console.log("⏰ Running subscription check at midnight...");
    checkSubscriptions();
  });
});

module.exports = {};