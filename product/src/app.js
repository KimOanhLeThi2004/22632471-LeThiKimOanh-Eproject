const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const productRoutes = require("./routes/productRoutes");

class App {
  constructor() {
    this.app = express();
    this.config();
    this.routes();
    this.connectDB();
  }

  config() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  routes() {
    this.app.use("/", productRoutes);
  }

  connectDB() {
    mongoose
      .connect(process.env.MONGODB_PRODUCT_URI || "mongodb://localhost:27017/productdb")
      .then(() => console.log("✅ MongoDB connected"))
      .catch((err) => console.error("❌ MongoDB connection error:", err));
  }

  start() {
    const PORT = process.env.PORT || 3001;
    this.app.listen(PORT, () => console.log(`🚀 Product service running on port ${PORT}`));
  }
}

module.exports = App;
