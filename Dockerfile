# Gunakan image Node resmi ringan
FROM node:18-slim

# Install Chromium dependencies & Chromium itself
RUN apt-get update && apt-get install -y \
    chromium \
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

# Working directory
WORKDIR /app

# Copy package.json lalu install dependency
COPY package*.json ./
RUN npm install --omit=dev

# Copy semua file project
COPY . .

# Expose port (untuk keperluan proxy meski tidak digunakan)
EXPOSE 3000

# Start bot
CMD ["npm", "start"]
