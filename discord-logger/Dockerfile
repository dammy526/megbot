FROM node:18-alpine

WORKDIR /app

# 複製 package.json 首先（為了更好的緩存）
COPY package*.json ./
RUN npm install

# 複製其餘檔案
COPY . .

# 安裝 canvas 系統依賴
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

CMD ["node", "logger.js"]