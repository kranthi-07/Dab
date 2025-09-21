const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const router = express.Router();

// 🔹 Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    const existingUser = await User.findOne({ mobile });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, mobile, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Error signing up", error: err.message });
  }
});

// 🔹 Signin Route
router.post("/signin", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.json({
      message: "Login successful",
      user: { name: user.name, mobile: user.mobile }
    });
  } catch (err) {
    res.status(500).json({ message: "Error signing in", error: err.message });
  }
});

// 🔹 Update Profile
router.put("/update", async (req, res) => {
  try {
    const { mobile, name, password } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedUser = await User.findOneAndUpdate({ mobile }, updateData, { new: true });

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile", error: err.message });
  }
});

module.exports = router;