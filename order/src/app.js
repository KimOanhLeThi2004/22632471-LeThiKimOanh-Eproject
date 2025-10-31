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

    // <-- THÊM DÒNG NÀY (Để tránh crash nếu RabbitMQ chưa kết nối được)
    if (!channel) {
      console.warn("Cannot setup consumer, channel is not available. Will retry...");
      // Hàm connectRabbitMQ của bạn (phiên bản đã sửa) sẽ tự động thử kết nối lại
      return; 
    }

    channel.consume("orders", async (data) => {
      
      try { 
        console.log("Consuming ORDER service");
        const { products, username, orderId } = JSON.parse(data.content); // <-- SỬA DÒNG NÀY (Nhận thêm orderId)

        const productIDs = products.map(p => p._id); // Trích xuất mảng ID
        const calculatedTotalPrice = products.reduce((acc, p) => acc + p.price, 0);

        const Order = require("./models/order");
        const newOrder = new Order({
          orderId: orderId,
          products: productIDs, // <-- SỬA DÒNG NÀY (Dùng mảng ID)
          user: username,
          totalPrice: calculatedTotalPrice, // <-- SỬA DÒNG NÀY (Dùng tổng tiền đã tính)
       });
       await newOrder.save();

       channel.ack(data);
       console.log(`Order ${orderId} saved to MongoDB`); 

      } catch (err) {
        console.error("Error saving order to MongoDB:", err.message);
        // Nack (từ chối) tin nhắn và không đưa lại vào hàng đợi (false)
        // để tránh vòng lặp lỗi nếu tin nhắn bị hỏng
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
