const Coupon = require("../models/Coupon");
const User = require("../models/User");

// Duration mapping
const planDurations = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

exports.assignSubscription = async (req, res) => {
  try {
    const { plan, paymentMethod, transactionId, couponCode } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ error: "User not found" });

    let coupon = null;

    // Apply coupon if provided
    if (couponCode) {
      const couponDoc = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        type: "subscription", // ensure coupon is for subscription
        status: "enable",
      });

      if (!couponDoc) {
        return res.status(400).json({ error: "Invalid or disabled coupon code" });
      }

      coupon = {
        code: couponDoc.code,
        discount: couponDoc.discount,
      };
    }

    // validate plan
    if (!planDurations[plan.toLowerCase()]) {
      return res.status(400).json({ error: "Invalid subscription plan" });
    }

    const today = new Date();
    let startDate = new Date(today);

    if (user.subscriptionHistory.length > 0) {
      const lastHistory =
        user.subscriptionHistory[user.subscriptionHistory.length - 1];

      if (lastHistory.endDate) {
        const lastEndDate = new Date(lastHistory.endDate);
        if (today <= lastEndDate) {
          lastEndDate.setDate(lastEndDate.getDate() + 1);
          startDate = lastEndDate;
        }
      }
    }

    // Determine endDate based on plan
    let endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + planDurations[plan.toLowerCase()]);

    // Assign subscription
    user.subscription = {
      plan,
      startDate,
      endDate,
      status: "Active",
      paymentMethod,
      transactionId,
      appliedCoupon: coupon,
    };

    // Add to history
    user.subscriptionHistory.push({
      plan,
      startDate,
      endDate,
      paymentMethod,
      transactionId,
      appliedCoupon: coupon,
      status: "Active",
    });

    await user.save();
    res.json({ success: true, subscription: user.subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

// Check Subscription Status
exports.checkSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.subscription)
      return res.status(404).json({ error: "Subscription not found" });

    const today = new Date();
    if (user.subscription.endDate && today > user.subscription.endDate) {
      user.subscription.status = "Expired";
      await user.save();
    }

    res.json({ subscription: user.subscription });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

// Unsubscribe
exports.unsubscribe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.subscription)
      return res.status(404).json({ error: "Subscription not found" });

    user.subscription.status = "Cancelled";

    user.subscriptionHistory.push({
      plan: user.subscription.plan,
      startDate: user.subscription.startDate,
      endDate: user.subscription.endDate,
      paymentMethod: user.subscription.paymentMethod,
      transactionId: user.subscription.transactionId,
      appliedCoupon: user.subscription.appliedCoupon
        ? {
            code: user.subscription.appliedCoupon.code,
            discount: user.subscription.appliedCoupon.discount,
          }
        : null,
      status: "Cancelled",
    });

    await user.save();

    res.json({ success: true, message: "Subscription cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};
