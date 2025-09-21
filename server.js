require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------
const session = require("express-session");
const MongoStore = require("connect-mongo");

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ✅ Serve static files from frontend folder
app.use(express.static(path.join(__dirname, "frontend")));

// ---------- DATABASE CONNECTION ----------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---------- USER MODEL ----------
const favoriteSchema = new mongoose.Schema({
  productId: String,
  name: String,
  price: Number,
  image: String,
  desc: String
});

const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  mobile: String,
  password: String,
  cart: [
    {
      productId: String,
      name: String,
      qty: Number,
      price: Number,
      image: String,
      desc: String,
    }
  ],
  favorites: { type: [favoriteSchema], default: [] }
}));

// ---------------- SIGNUP ----------------
app.post("/signup", async (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, mobile, password: hashedPassword });
    await newUser.save();

    res.json({ success: true, message: "Signup successful!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------- SIGNIN ----------------
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    req.session.userId = user._id;

    res.json({
      message: "Login successful!",
      user: { name: user.name, mobile: user.mobile }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- GET PROFILE ----------------
app.get("/api/auth/profile", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const user = await User.findById(req.session.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- UPDATE PROFILE ----------------
app.put("/api/auth/profile/update", async (req, res) => {
  try {
    const { mobile, name, password } = req.body;
    let updateData = { name };

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findOneAndUpdate(
      { mobile },
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- CART ROUTES ----------------
app.get("/api/cart", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ items: user.cart || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/cart", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const { productId, name, qty, price, image, desc } = req.body;
    if (!productId || !name || !qty) return res.status(400).json({ message: "Invalid cart data" });

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const item = user.cart.find(i => i.productId === productId);
    if (item) {
      item.qty += qty;
    } else {
      user.cart.push({ productId, name, qty, price, image, desc });
    }

    await user.save();
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    console.error("❌ Cart error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.put("/api/cart", async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

    const { productId, qty } = req.body;
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const itemIndex = user.cart.findIndex(i => i.productId === productId);
    if (itemIndex === -1) return res.status(404).json({ message: "Item not in cart" });

    if (qty <= 0) user.cart.splice(itemIndex, 1);
    else user.cart[itemIndex].qty = qty;

    await user.save();
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/cart", async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: "Product ID required" });

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.cart = user.cart.filter(item => item.productId !== productId);
    await user.save();
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    console.error("❌ Remove error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ---------------- FAVORITES ROUTES ----------------

// Get user favorites
app.get("/api/favorites", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ items: user.favorites || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add to favorites
app.post("/api/favorites", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const { productId, name, price, image, desc } = req.body;
    if (!productId) return res.status(400).json({ message: "Product ID required" });

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Avoid duplicates
    if (!user.favorites.some(fav => fav.productId === productId)) {
      user.favorites.push({ productId, name, price, image, desc });
      await user.save();
    }

    res.json({ success: true, message: "Added to favorites" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Remove from favorites
app.delete("/api/favorites", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });

  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: "Product ID required" });

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.favorites = user.favorites.filter(fav => fav.productId !== productId);
    await user.save();

    res.json({ success: true, message: "Removed from favorites" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------------------- LOGOUT ROUTE --------------------
app.get("/logout", (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ success: false, message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "Logged out successfully" });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------- DEFAULT ROUTE ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "signup.html"));
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
