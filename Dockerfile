# Gunakan base image Node yang ringan tapi stabil
FROM node:18-slim

# Install Chromium dependencies (minimal yang dibutuhkan)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libnss3 \
    libasound2 \
    libx11-xcb1 \
    libxshmfence1 \
    xdg-utils \
    fonts-liberation \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Tetapkan direktori kerja
WORKDIR /app

# Salin file dependency dulu untuk cache build
COPY package*.json ./
RUN npm install --omit=dev

# Salin seluruh project
COPY . .

# Environment untuk Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Port (meski tidak digunakan langsung)
EXPOSE 3000

# Jalankan bot
CMD ["npm", "start"]
