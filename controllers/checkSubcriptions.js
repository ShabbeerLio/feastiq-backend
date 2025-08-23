// require("dotenv").config();
// const cron = require("node-cron");
const User = require("../models/User");
const express = require("express");
const router = express.Router();
const AdminDetail = require("../models/AdminDetail");
const connectToMongo = require("../db");
const { initOrMonthlyJob } = require("./fetchPanchang");
connectToMongo();

const checkSubscriptions = async () => {
  try {
    console.log("Running daily subscription check...");

    const users = await User.find({
      $or: [
        { "subscription.endDate": { $exists: true } },
        { "subscriptionHistory.endDate": { $exists: true } },
      ],
    });

    const today = new Date();

    for (let user of users) {
      let modified = false;

      /** Check current active subscription */
      if (user.subscription.endDate && today > user.subscription.endDate) {
        if (user.subscription.status !== "Expired") {
          user.subscription.status = "Expired";
          modified = true;
          console.log(`Active subscription expired for: ${user.email}`);
        }
      }

      /** Check ALL entries in subscriptionHistory */
      user.subscriptionHistory.forEach((history) => {
        if (history.endDate && today > history.endDate) {
          if (history.status !== "Expired") {
            history.status = "Expired";
            modified = true;
            console.log(
              `Updated history subscription to expired for: ${user.email}`
            );
          }
        }
      });

      /** Save only if something changed */
      if (modified) {
        await user.save();
      }
    }

    console.log("Subscription check completed.");
    return;
  } catch (err) {
    console.error("Error checking subscriptions:", err);
    return;
  }
};


(async () => {
  await Promise.all([
    checkSubscriptions()
  ]);
  process.exit(0);
})();

