const express = require("express");
const mongoose = require("mongoose");
const amqp = require("amqplib");
const config = require("./config");

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.connectDB();
    this.setupOrderConsumer();
    this.setupRoutes();
  }

  async connectDB() {
    try {
      await mongoose.connect(config.mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("MongoDB connected");
    } catch (err) {
      console.error("MongoDB connection failed:", err.message);
      setTimeout(() => this.connectDB(), 5000);
    }
  }

  async connectRabbitMQ() {
    const connection = await amqp.connect(config.rabbitMQURI);
    const channel = await connection.createChannel();
    await channel.assertQueue("orders");
    console.log("RabbitMQ connected");
    return channel;
  }

async setupOrderConsumer() {
   const channel = await this.connectRabbitMQ();
    if (!channel) return; // Thêm kiểm tra

   channel.consume("orders", async (data) => {
      try { // Thêm try...catch
        console.log("Consuming ORDER service");

        // 1. Nhận đầy đủ dữ liệu (gốc) và tính toán
        const { products: fullProducts, username, orderId } = JSON.parse(data.content); // Lấy orderId
        const productIDs = fullProducts.map(p => p._id);
        const calculatedTotalPrice = fullProducts.reduce((acc, p) => acc + p.price, 0);

        const Order = require("./models/order");
        const newOrder = new Order({
          orderId: orderId, // <-- 2. THÊM DÒNG NÀY
          products: productIDs, // Dùng ID
          user: username,
          totalPrice: calculatedTotalPrice, // Dùng tổng tiền
        });
        await newOrder.save();

        channel.ack(data);
        console.log(`Order ${orderId} saved to MongoDB`); // Sửa log

      } catch (err) { // Thêm catch
        console.error("Error saving order:", err.message);
        channel.nack(data, false, false);
      }
    });
  }

  setupRoutes() {
    this.app.post("/test-order", async (req, res) => {
      try {
        const channel = await this.connectRabbitMQ();
        await channel.sendToQueue(
          "orders",
          Buffer.from(JSON.stringify(req.body))
        );
        res.status(200).json({ message: "Order request sent to queue" });
      } catch (err) {
        console.error("Error sending order:", err);
        res.status(500).json({ error: err.message });
      }
    });
  }

  start() {
    this.app.listen(config.port, () =>
      console.log(`Order service running on port ${config.port}`)
    );
  }
}

module.exports = App;
