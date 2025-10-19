#!/bin/sh
echo "Bắt đầu kiểm thử API các service..."

sleep 10  # chờ các container service khởi động xong

check_api() {
  SERVICE_NAME=$1
  URL=$2

  echo "🔹 Kiểm tra $SERVICE_NAME: $URL"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL)

  if [ "$STATUS" -eq 200 ]; then
    echo "✅ $SERVICE_NAME hoạt động bình thường (HTTP 200)"
  else
    echo "❌ $SERVICE_NAME lỗi hoặc không phản hồi (mã $STATUS)"
    exit 1
  fi
}

# Ví dụ test endpoint gốc của từng service (chỉnh theo dự án của bạn)
check_api "Product Service" "http://product-service:3000/"
check_api "Order Service" "http://order-service:3000/"
check_api "Payment Service" "http://payment-service:3000/"

echo "Tất cả API đều hoạt động ổn định!"
