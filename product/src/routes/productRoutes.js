const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/productController");
const isAuthenticated = require("../utils/isAuthenticated");

const productController = new ProductController();

// API routes
router.post("/api/products", isAuthenticated, productController.createProduct);
router.post("/api/products/buy", isAuthenticated, productController.createOrder);
router.get("/api/products", isAuthenticated, productController.getProducts);

module.exports = router;
