// require("dotenv").config();
const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var fetchuser = require("../middleware/fetchUser");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const Otp = require("../models/Otp");
const UserDetails = require("../models/Detail");
const DeleteRequest = require("../models/DeleteRequest");
const passport = require("passport");
// <-- replace the path based on where your model file is

const JWT_SECRET = "feastIQ";

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

// Route to trigger Google Login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback from Google
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign({ user: { id: req.user._id } }, JWT_SECRET);
    res.redirect(`http://localhost:3000/login/?token=${token}`); // redirect to frontend with token
  }
);

// Route 1 :Create a User using a POST "/api/auth/createuser" dosn't required Auth
router.post(
  "/createuser",
  [
    body("name", "Enter a valid Name").isLength({ min: 3 }),
    body("email", "Enter a valid Email").isEmail(),
    body("password", "Password must be 5 degit").isLength({ min: 5 }),
    body("age", "Enter your age"),
    body("gender", "Enter your gender"),
    body("weight", "Enter your weight"),
    body("height", "Enter your height"),
    body("goal", "Enter your goal"),
    body("foodpreferences", "Enter your food preferences"),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success, errors: errors.array() });
    }

    // check email with same email exist

    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res
          .status(400)
          .json({ success, error: "This email already exists" });
      }

      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(req.body.password, salt);

      // create a  new user
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: secPass,
        age: req.body.age,
        gender: req.body.gender,
        weight: req.body.weight,
        height: req.body.height,
        goal: req.body.goal,
        foodpreferences: req.body.foodpreferences,
      });

      const data = {
        user: {
          id: user.id,
        },
      };
      const authToken = jwt.sign(data, JWT_SECRET);

      // res.json(user)
      success = true;
      res.json({ success, authToken });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server Error");
    }
  }
);

// Route 2 : Authentication a User using a POST "/api/auth/login" no login required
router.post(
  "/login",
  [
    body("email", "Enter a valid Email").isEmail(),
    body("password", "Enter a unique password").exists(),
  ],
  async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (!user) {
        success = false;
        return res
          .status(400)
          .json({ error: "Please login with correct email and password" });
      }

      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        success = false;
        return res.status(400).json({
          success,
          error: "Please login with correct email and password",
        });
      }

      const data = {
        user: {
          id: user.id,
        },
      };
      success = true;
      const authToken = jwt.sign(data, JWT_SECRET);
      res.json({ success, authToken });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server Error");
    }
  }
);

// Route 3 : Get loggedin User user detail using a POST "/api/auth/getuser" no login required

router.post("/getuser", fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal server Error");
  }
});

// Route 4: Update user details using a PUT "/api/auth/edituser" - Login required
router.put(
  "/edituser",
  fetchuser,
  [
    body("name", "Enter a valid name").optional().isLength({ min: 3 }),
    body("email", "Enter a valid email").optional().isEmail(),
    body("password", "Password must be at least 5 characters")
      .optional()
      .isLength({ min: 5 }),
    body("age", "Enter your age").optional(),
    body("gender", "Enter your gender").optional(),
    body("weight", "Enter your birth weight").optional(),
    body("height", "Enter your birth height").optional(),
    body("goal", "Enter your birth goal").optional(),
    body("foodpreferences", "Enter your foodpreferences").optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      password,
      age,
      gender,
      weight,
      height,
      goal,
      foodpreferences
    } = req.body;
    const updatedFields = {};

    // Add fields to be updated if provided
    if (name) updatedFields.name = name;
    if (email) updatedFields.email = email;
    if (age) updatedFields.age = age;
    if (gender) updatedFields.gender = gender;
    if (weight) updatedFields.weight = weight;
    if (height) updatedFields.height = height;
    if (goal) updatedFields.goal = goal;
    if (foodpreferences) updatedFields.foodpreferences = foodpreferences;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updatedFields.password = await bcrypt.hash(password, salt);
    }

    try {
      // Find user and update their data
      const userId = req.user.id;
      let user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user = await User.findByIdAndUpdate(
        userId,
        { $set: updatedFields },
        { new: true } // Return the updated document
      ).select("-password");

      res.json({ success: true, user });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server error");
    }
  }
);

// PUT "/api/auth/admin/edituser/:id" - Admin login required
router.put(
  "/admin/edituser/:id",
  fetchuser,
  isAdmin,
  [
    body("name", "Enter a valid name").optional().isLength({ min: 3 }),
    body("email", "Enter a valid email").optional().isEmail(),
    body("password", "Password must be at least 5 characters")
      .optional()
      .isLength({ min: 5 }),
    body("age", "Enter your age").optional(),
    body("gender", "Enter your gender").optional(),
    body("weight", "Enter your weight").optional(),
    body("height", "Enter your height").optional(),
    body("goal", "Enter your goal").optional(),
    body("foodpreferences", "Enter your foodpreferences").optional(),
    body("role", "Role must be a string").optional().isString(), // Optional: allow admin to change role
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      password,
      age,
      gender,
      weight,
      height,
      goal,
      foodpreferences,
      role,
    } = req.body;
    const updatedFields = {};

    if (name) updatedFields.name = name;
    if (email) updatedFields.email = email;
    if (age) updatedFields.age = age;
    if (gender) updatedFields.gender = gender;
    if (weight) updatedFields.weight = weight;
    if (height) updatedFields.height = height;
    if (goal) updatedFields.goal = goal;
    if (foodpreferences) updatedFields.foodpreferences = foodpreferences;
    if (role) updatedFields.role = role;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updatedFields.password = await bcrypt.hash(password, salt);
    }

    try {
      const userId = req.params.id;
      let user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user = await User.findByIdAndUpdate(
        userId,
        { $set: updatedFields },
        { new: true }
      ).select("-password");

      res.json({ success: true, user });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server error");
    }
  }
);

// Route 5: Fetch All Users - Only accessible by Admin
router.get("/getallusers", fetchuser, async (req, res) => {
  try {
    // Fetch the logged-in user's details
    const loggedInUser = await User.findById(req.user.id);

    // Check if the user exists and is an admin
    if (!loggedInUser || loggedInUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    // Fetch all users, excluding passwords
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal server error");
  }
});

// Route 6: Delete a user and their details by Admin - Only accessible by Admin
router.delete("/deleteuser/:id", fetchuser, async (req, res) => {
  try {
    const loggedInUser = await User.findById(req.user.id);

    // Check if the user is an admin
    if (!loggedInUser || loggedInUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const userIdToDelete = req.params.id;

    // Prevent admin from deleting themselves (optional)
    if (userIdToDelete === req.user.id) {
      return res.status(400).json({ error: "Admin cannot delete themselves" });
    }

    // Check if user exists
    const userToDelete = await User.findById(userIdToDelete);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete the user
    await User.findByIdAndDelete(userIdToDelete);

    // Attempt to delete associated user details (if they exist)
    const userDetails = await UserDetails.findOne({ user: userIdToDelete });
    if (userDetails) {
      await UserDetails.deleteOne({ user: userIdToDelete });
    }

    res.json({
      success: true,
      message: "User deleted. Details removed if found.",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal server error");
  }
});

// Route 7: Request for deleting
// 1. Route: User Requests Account Deletion POST /api/auth/request-delete
router.post("/request-delete", fetchuser, async (req, res) => {
  try {
    const existingRequest = await DeleteRequest.findOne({ user: req.user.id });
    if (existingRequest) {
      return res
        .status(400)
        .json({ error: "Delete request already submitted." });
    }

    const deleteRequest = new DeleteRequest({
      user: req.user.id,
      email: req.body.email || "",
    });

    await deleteRequest.save();
    res.json({ success: true, message: "Delete request submitted." });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal server error");
  }
});

// 2. Route: Admin Gets All Delete Requests GET /api/auth/delete-requests
router.get("/delete-requests", fetchuser, async (req, res) => {
  try {
    const loggedInUser = await User.findById(req.user.id);

    // Check if the user is an admin
    if (!loggedInUser || loggedInUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const requests = await DeleteRequest.find();
    res.json(requests);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal server error");
  }
});

// 3. Route: DELETE /api/auth/cancel-delete-request/:userid
router.delete("/cancel-delete-request/:userid", fetchuser, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const userId = req.params.userid;

    const request = await DeleteRequest.findOne({ user: userId });
    if (!request) {
      return res.status(404).json({ error: "Delete request not found" });
    }

    await DeleteRequest.deleteOne({ user: userId });

    res.json({ success: true, message: "Delete request canceled by admin." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal server error");
  }
});

// Route 7: Forgot Password

// Step 1: Send OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_ID,
        pass: process.env.PASS_KEY,
      },
    });

    await transporter.sendMail({
      from: '"FeastIQ" <feastiq@gmail.com>',
      to: email,
      subject: "Your OTP for Password Reset",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    });

    // Save or update OTP
    await Otp.findOneAndUpdate(
      { email },
      { email, otp, createdAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal server error");
  }
});

// Step 2: Verify OTP only
router.post("/verify-reset-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired OTP" });
    }

    res.json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal server error");
  }
});

// Step 3: Reset Password (after OTP is verified)
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    await Otp.deleteOne({ _id: validOtp._id });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
