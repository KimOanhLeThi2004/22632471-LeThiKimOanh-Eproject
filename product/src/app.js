const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const productRoutes = require("./routes/productRoutes");
// 1. Import messageBroker
const messageBroker = require("./utils/messageBroker");

class App {
  constructor() {
    this.app = express();
    this.config();
    this.routes();
    // 2. Gọi hàm kết nối chung thay vì chỉ connectDB
    this.connectServices();
  }

  config() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  routes() {
    this.app.use("/", productRoutes);
  }

  // 4. Đổi tên hàm và thêm async
  async connectServices() {
    // Kết nối MongoDB
    try {
      await mongoose.connect(process.env.MONGODB_PRODUCT_URI || "mongodb://mongo:27017/productdb");
      console.log("MongoDB connected");
    } catch (err) {
      console.error("MongoDB connection error:", err);
      // Bạn có thể thêm logic retry hoặc thoát ở đây nếu muốn
    }

    // Kết nối RabbitMQ
    console.log("Calling messageBroker.connect()..."); // Log kiểm tra
    await messageBroker.connect(); // <-- 5. Gọi kết nối RabbitMQ
  }

  start() {
    const PORT = process.env.PORT || 3001;
    this.app.listen(PORT, () => console.log(`Product service running on port ${PORT}`));
  }
}

module.exports = App;