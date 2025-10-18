require('dotenv').config();

module.exports = {
    mongoURI: process.env.MONGODB_ORDER_URI || 'mongodb://mongo:27017/orderdb',
    rabbitMQURI: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672', // ✅ sửa lại đúng biến ENV
    rabbitMQQueue: process.env.RABBITMQ_QUEUE || 'orders',
    port: process.env.PORT || 3002
};
