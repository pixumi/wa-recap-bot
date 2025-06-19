# Gunakan image Node resmi
FROM node:18-slim

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