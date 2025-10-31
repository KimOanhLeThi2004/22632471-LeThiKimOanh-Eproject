const Product = require("../models/product");
const messageBroker = require("../utils/messageBroker");
const uuid = require('uuid');
const mongoose = require('mongoose');
const OrderSchema = require('../models/order');

let OrderModel;
try {
  const orderDbUri = process.env.MONGODB_ORDER_URI;
  if (!orderDbUri) {
    console.error("MONGODB_ORDER_URI is not set in product service env!");
  } else {
    // Tạo kết nối riêng biệt đến orderdb
    const orderDbConnection = mongoose.createConnection(orderDbUri);
    
    // Gắn model 'Order' vào kết nối này
    OrderModel = orderDbConnection.model('Order', OrderSchema.schema); 
    
    orderDbConnection.on('error', (err) => {
        console.error("Product Service failed to connect to OrderDB:", err.message);
    });
    orderDbConnection.once('open', () => {
        console.log("Product Service connected to OrderDB for reading status.");
    });
  }
} catch(e) {
  console.error("Error creating OrderDB connection in Product service", e);
}

class ProductController {

  constructor() {
    this.createOrder = this.createOrder.bind(this);
    this.getOrderStatus = this.getOrderStatus.bind(this);
    this.createProduct = this.createProduct.bind(this);
    this.getProducts = this.getProducts.bind(this);
    this.ordersMap = new Map();

  }

  async createProduct(req, res, next) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const product = new Product(req.body);

      const validationError = product.validateSync();
      if (validationError) {
        return res.status(400).json({ message: validationError.message });
      }

      await product.save({ timeout: 30000 });

      res.status(201).json(product);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }

  async createOrder(req, res, next) {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = req.body;
    const products = await Product.find({ _id: { $in: [_id] } });

    const orderId = uuid.v4();

    const orderData = { // Tạo object dữ liệu để tái sử dụng
      products,
      username: req.user?.username || "guest",
      orderId,
    };

    // Gửi message sang hàng đợi "orders"
    await messageBroker.publishMessage("orders", orderData);

    this.ordersMap.set(orderId, {
      orderId,
      products
    });

    this.ordersMap.set(orderId, {
      ...orderData, // Lưu đầy đủ thông tin tạm
      status: "PENDING_IN_CACHE" 
    });

    // Phản hồi ngay cho client (không chờ Order service phản hồi)
    return res.status(200).json({
      message: "Order request sent to queue",
      orderId,
      totalProducts: products.length,
    });

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Server error" });
  }
}


  async getOrderStatus(req, res, next) {
    const { orderId } = req.params;

    // === 6. SỬA: Đọc từ DB (vĩnh viễn) thay vì RAM ===
    try {
      if (!OrderModel) {
         return res.status(503).json({ message: "Order status check service not ready." });
      }

      // Tìm trong DB bằng 'orderId' (UUID)
      const order = await OrderModel.findOne({ orderId: orderId }); 

      if (!order) {
        // Nếu không thấy trong DB (có thể do 'order' service chưa xử lý kịp)
        // Thử tìm trong bộ nhớ tạm (cache)
        const cachedOrder = this.ordersMap.get(orderId);
        if (cachedOrder) {
            return res.status(200).json(cachedOrder); // Trả về từ cache
        }
        
        return res.status(404).json({ message: "Order not found in database or cache" });
      }
      
      return res.status(200).json(order); // Trả về từ DB

    } catch (dbError) {
      console.error("Error querying order database:", dbError);
      return res.status(500).json({ message: "Database query error" });
    }
}

module.exports = ProductController;