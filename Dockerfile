# Gunakan image Node resmi
FROM node:18-slim

# Install Chromium dan dependensi Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
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
    libgbm1 \
    xdg-utils \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Opsional: buat alias agar kompatibel dengan path puppeteer
RUN ln -fs /usr/bin/chromium /usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Salin dan install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Salin semua file ke image
COPY . .

# Port dummy untuk Fly.io (tidak digunakan)
EXPOSE 3000

# Jalankan bot
CMD ["npm", "start"]
