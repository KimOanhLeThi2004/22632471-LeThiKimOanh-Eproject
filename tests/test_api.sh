#!/bin/sh
echo "🔍 Bắt đầu kiểm thử API các service..."

sleep 15  # chờ container khác khởi động

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

# ⚙️ Test các service thật trong compose
check_api "Auth Service" "http://auth:3000/"
check_api "Product Service" "http://product:3001/"
check_api "Order Service" "http://order:3002/"
check_api "API Gateway" "http://api-gateway:3003/"

echo "🎉 Tất cả API đều hoạt động ổn định!"
