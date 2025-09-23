require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------
app.set("trust proxy", 1); // For Render/Heroku HTTPS

app.use(session({
  secret: process.env.SESSION_SECRET,       // REQUIRED
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send cookies over HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24                 // 1 day
  }
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "frontend")));

// ---------- DATABASE ----------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

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
  cart: [{ productId: String, name: String, qty: Number, price: Number, image: String, desc: String }],
  favorites: { type: [favoriteSchema], default: [] }
}));

// ---------- SIGNUP ----------
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, mobile, password } = req.body;
    const existingUser = await User.findOne({ mobile });
    if (existingUser) return res.status(400).json({ message: "User already exists!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, mobile, password: hashedPassword });
    await newUser.save();

    res.json({ success: true, message: "Signup successful!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- SIGNIN ----------
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const user = await User.findOne({ mobile });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    req.session.userId = user._id;

    res.json({ success: true, message: "Login successful!", user: { name: user.name, mobile: user.mobile } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- GET PROFILE ----------
app.get("/api/auth/profile", async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
    const user = await User.findById(req.session.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- UPDATE PROFILE ----------
app.put("/api/auth/profile/update", async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
    const { name, password } = req.body;
    const updateData = { name };

    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.session.userId, updateData, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, message: "Profile updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- CART ----------
app.get("/api/cart", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  const user = await User.findById(req.session.userId);
  res.json({ items: user?.cart || [] });
});

app.post("/api/cart", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  const { productId, name, qty, price, image, desc } = req.body;
  if (!productId || !name || !qty) return res.status(400).json({ message: "Invalid cart data" });

  const user = await User.findById(req.session.userId);
  const item = user.cart.find(i => i.productId === productId);
  if (item) item.qty += qty;
  else user.cart.push({ productId, name, qty, price, image, desc });

  await user.save();
  res.json({ success: true, cart: user.cart });
});


// DELETE /api/cart
app.delete("/api/cart", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ message: "Product ID required" });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Remove item from cart
    user.cart = user.cart.filter(item => item.productId !== productId);
    await user.save();

    res.json({ success: true, message: "Item removed from cart", cart: user.cart });
  } catch (err) {
    console.error("Cart delete error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});







// PUT /api/cart -> Update quantity of a product
app.put("/api/cart", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const { productId, qty } = req.body;
  if (!productId || qty <= 0) {
    return res.status(400).json({ message: "Invalid product ID or quantity" });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find item in cart
    const item = user.cart.find(i => i.productId === productId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Update quantity
    item.qty = qty;
    await user.save();

    res.json({ success: true, cart: user.cart });
  } catch (err) {
    console.error("Cart update error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// ---------- FAVORITES ----------
app.get("/api/favorites", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  const user = await User.findById(req.session.userId);
  res.json({ items: user?.favorites || [] });
});

app.post("/api/favorites", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  const { productId, name, price, image, desc } = req.body;
  const user = await User.findById(req.session.userId);
  if (!user.favorites.some(f => f.productId === productId)) {
    user.favorites.push({ productId, name, price, image, desc });
    await user.save();
  }
  res.json({ success: true });
});




// DELETE /api/favorites
app.delete("/api/favorites", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ message: "Product ID required" });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.favorites = user.favorites.filter(item => item.productId !== productId);
    await user.save();

    res.json({ success: true, message: "Item removed from favorites", favorites: user.favorites });
  } catch (err) {
    console.error("Favorites delete error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// ---------- LOGOUT ----------
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out" });
  });
});

// ---------- DEFAULT ROUTE ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "signup.html"));
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
