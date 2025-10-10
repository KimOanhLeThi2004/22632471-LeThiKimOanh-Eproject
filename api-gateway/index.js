const express = require("express");
const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer();
const app = express();

// Middleware log (tùy chọn, giúp debug)
app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.originalUrl}`);
  next();
});

// Route Auth service
app.use("/auth", (req, res) => {
  proxy.web(req, res, {
    target: "http://auth:3000", // hostname = service name trong docker-compose
    changeOrigin: true,
    ignorePath: false, // giữ nguyên path cho Auth
  });
});

// Route Product service
app.use("/api/products", (req, res) => {
  proxy.web(req, res, {
    target: "http://product:3001", // hostname = service name
    changeOrigin: true,
    ignorePath: false, // Product service sẽ nhận path "/" → router match
  });
});

// Route Order service
app.use("/orders", (req, res) => {
  proxy.web(req, res, {
    target: "http://order:3002", // hostname = service name
    changeOrigin: true,
    ignorePath: false, // giữ nguyên path cho Order
  });
});

// Catch-all route (404)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found on API Gateway" });
});

// Error handling
proxy.on("error", (err, req, res) => {
  console.error(`[Gateway] Proxy error: ${err.message}`);
  res.status(502).json({ message: "Bad gateway", error: err.message });
});

const port = process.env.PORT || 3003;
app.listen(port, "0.0.0.0", () => {
  console.log(`API Gateway listening on port ${port}`);
});
