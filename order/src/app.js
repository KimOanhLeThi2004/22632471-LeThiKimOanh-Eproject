const express = require("express");
const mongoose = require("mongoose");
const Order = require("./models/order");
const amqp = require("amqplib");
const config = require("./config");

class App {
  constructor() {
    this.app = express();
    this.connectDB();
    this.setupOrderConsumer();
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
      setTimeout(() => this.connectDB(), 5000); // Thử lại sau 5s
    }
  }

  async connectRabbitMQWithRetry(retries = 10, delay = 5000) {
    const amqpServer = "amqp://rabbitmq:5672";
    for (let i = 1; i <= retries; i++) {
      try {
        console.log(`Connecting to RabbitMQ (attempt ${i})...`);
        const connection = await amqp.connect(amqpServer);
        console.log("RabbitMQ connected");
        return connection;
      } catch (err) {
        console.error(`Failed to connect to RabbitMQ: ${err.message}`);
        if (i < retries) {
          console.log(`Retrying in ${delay / 1000}s...`);
          await new Promise((res) => setTimeout(res, delay));
        } else {
          throw new Error("RabbitMQ connection failed after max retries");
        }
      }
    }
  }

  async setupOrderConsumer() {
    try {
      const connection = await this.connectRabbitMQWithRetry();
      const channel = await connection.createChannel();
      await channel.assertQueue("orders");

      channel.consume("orders", async (data) => {
        console.log("Consuming ORDER service");
        const { products, username, orderId } = JSON.parse(data.content);

        const newOrder = new Order({
          products,
          user: username,
          totalPrice: products.reduce((acc, product) => acc + product.price, 0),
        });

        await newOrder.save();

        channel.ack(data);
        console.log("Order saved to DB and ACK sent to ORDER queue");

        const { user, products: savedProducts, totalPrice } = newOrder.toJSON();
        channel.sendToQueue(
          "products",
          Buffer.from(
            JSON.stringify({ orderId, user, products: savedProducts, totalPrice })
          )
        );
      });
    } catch (err) {
      console.error("Order service failed to start:", err.message);
    }
  }

  start() {
    this.server = this.app.listen(config.port, () =>
      console.log(`Server started on port ${config.port}`)
    );
  }

  async stop() {
    await mongoose.disconnect();
    this.server.close();
    console.log("Server stopped");
  }
}

module.exports = App;
