const Coupon = require("../models/Coupon");
const User = require("../models/User");

// Assign Subscription with Optional Coupon
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
        // used: false,
      });

      if (!couponDoc) {
        return res.status(400).json({ error: "Invalid or used coupon code" });
      }

      coupon = {
        code: couponDoc.code,
        discount: couponDoc.discount,
        // used: true,
      };
    }

    const today = new Date();
    let startDate = new Date(today); // default to today

    if (user.subscriptionHistory.length > 0) {
      const lastHistory =
        user.subscriptionHistory[user.subscriptionHistory.length - 1];

      if (lastHistory.endDate) {
        const lastEndDate = new Date(lastHistory.endDate);
        if (today <= lastEndDate) {
          // If last endDate >= today, start next day
          lastEndDate.setDate(lastEndDate.getDate() + 1);
          startDate = lastEndDate;
        }
        // Else, startDate remains today (gap period handled automatically)
      }
    }

    // Determine endDate
    let endDate = new Date(startDate);
    if (plan === "Free") {
      endDate.setDate(startDate.getDate() + 1);
    } else {
      endDate.setDate(startDate.getDate() + 30);
    }

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

// Unsubscribe (Cancel Subscription)
exports.unsubscribe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.subscription)
      return res.status(404).json({ error: "Subscription not found" });

    user.subscription.status = "Cancelled";

    // Save to history
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
