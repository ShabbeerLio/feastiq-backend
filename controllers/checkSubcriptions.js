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

// Schedule: Run every day at midnight
// const startSubscriptionCron = () => {
//   // cron.schedule("0 0 * * *", () => {
//   //   console.log("Running Subscription Check at:", new Date().toISOString());
//   // });
//   console.log("Subscription Cron Job Scheduled - Runs every day at 12:00 AM");
// };

// fetch monthlypanchange
// monthly panchaang

async function fetchMonthlyPanchang() {
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, "0");
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const year = currentDate.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  // Fetch API Key from Database
  let adminDetail = await AdminDetail.findOne();
  console.log(adminDetail, "adminDetail");
  if (!adminDetail || !adminDetail.apiKey.length) {
    return res.status(400).json({ message: "API Key not found" });
  }

  const apiKey = adminDetail.apiKey[0].apiKey;
  try {
    const users = await User.find();
    const adminUser = users.find((user) => user.role === "admin");
    if (!adminUser) {
      console.log("No admin user found.");
      return;
    }
    const apiUrl = `https://api.vedicastroapi.com/v3-json/panchang/monthly-panchang?api_key=${apiKey}&date=${formattedDate}&lat=28.7041&lon=77.1025&tz=5.5&lang=en`;
    const response = await fetch(apiUrl);
    const panchangData = await response.json();

    if (!panchangData || Object.keys(panchangData).length === 0) {
      console.log("No Panchang data received.");
      return;
    }
    adminDetail.monthlyPanchang = panchangData;
    await adminDetail.save();
    console.log(`Panchang data updated successfully at ${formattedDate}`);
    return;
  } catch (error) {
    console.error("Error fetching or saving Panchang data:", error);
    return;
  }
}

async function fetchMonthlyPanchang2() {
  const currentDate = new Date();
  const monthsToFetch = [];

  const currentMonth = currentDate.getMonth(); // 0-based
  const year = currentDate.getFullYear();

  // First call: fetch current and next month
  const month1 = String(currentMonth + 1).padStart(2, "0");
  const month2 = String(currentMonth + 2).padStart(2, "0");
  monthsToFetch.push({ month: month1, year });
  monthsToFetch.push({ month: month2, year });

  // On 1st of each month, fetch the next month
  if (currentDate.getDate() === 1) {
    const nextMonth = currentMonth + 2;
    const nextMonthStr = String((nextMonth % 12) + 1).padStart(2, "0");
    const nextMonthYear = nextMonth > 11 ? year + 1 : year;
    monthsToFetch.length = 0;
    monthsToFetch.push({ month: nextMonthStr, year: nextMonthYear });
  }

  const formattedDates = monthsToFetch.map(
    ({ month, year }) => `01/${month}/${year}`
  );

  let adminDetail = await AdminDetail.findOne();
  if (!adminDetail || !adminDetail.apiKey.length) {
    console.error("API Key not found");
    return;
  }

  const apiKey = adminDetail.apiKey[0].apiKey;
  if (!adminDetail.monthlyPanchangData) adminDetail.monthlyPanchangData = [];

  for (let i = 0; i < monthsToFetch.length; i++) {
    const { month, year } = monthsToFetch[i];
    const formattedDate = formattedDates[i];
    const monthKey = `${year}-${month}`;

    const alreadyExists = adminDetail.monthlyPanchangData.some(
      (entry) => entry.month === monthKey
    );

    if (alreadyExists) {
      console.log(`Panchang for ${monthKey} already exists, skipping...`);
      continue;
    }

    const apiUrl = `https://api.vedicastroapi.com/v3-json/panchang/monthly-panchang?api_key=${apiKey}&date=${formattedDate}&lat=28.7041&lon=77.1025&tz=5.5&lang=en`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log(data,"data")

      if (!data || Object.keys(data).length === 0) {
        console.log(`No data received for ${monthKey}`);
        continue;
      }

      adminDetail.monthlyPanchangData.push({
        month: monthKey,
        data: data.response,
      });

      console.log(`Saved Panchang for ${monthKey}`);
    } catch (error) {
      console.error(`Failed to fetch Panchang for ${monthKey}:`, error);
    }
  }

  await adminDetail.save();
}

// // ⏰ Schedule task to run at **12:00 AM (midnight) every day**
// cron.schedule("0 0 * * *", () => {
//   console.log("Running fetchMonthlyPanchang at midnight...");
// });

(async () => {
  await Promise.all([
    checkSubscriptions(),
    fetchMonthlyPanchang(),
    fetchMonthlyPanchang2(),
    initOrMonthlyJob(),
  ]);
  process.exit(0);
})();
fetchMonthlyPanchang2();

// router.get("/fetch-panchang", async (req, res) => {
//   await fetchMonthlyPanchang();
//   res.json({ message: "Panchang data fetched successfully" });
// });

// module.exports = startSubscriptionCron;
