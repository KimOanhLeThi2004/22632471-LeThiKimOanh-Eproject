const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/productController");
const isAuthenticated = require("../utils/isAuthenticated");

const productController = new ProductController();

// API routes
router.post("/", isAuthenticated, productController.createProduct);
router.post("/buy", isAuthenticated, productController.createOrder);
router.get("/", isAuthenticated, productController.getProducts);
router.get("/orders", isAuthenticated, productController.getOrderStatus);
router.get("/:orderId", isAuthenticated, productController.getOrderStatus);
module.exports = router;
