# Gunakan image Node resmi
FROM node:18-slim

# Install dependensi Puppeteer Chromium
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm1 \
 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Salin file package terlebih dahulu
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Salin semua file ke image
COPY . .

# Port default (tidak digunakan karena tidak ada web server, tapi Fly butuh ini)
EXPOSE 3000

# Jalankan bot
CMD ["npm", "start"]
