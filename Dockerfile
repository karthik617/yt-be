# -------- Base Image --------
FROM node:20-bullseye

# -------- System Dependencies --------
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# -------- Install yt-dlp --------
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

# -------- App Directory --------
WORKDIR /app

# -------- Install Node Dependencies --------
COPY package*.json ./
RUN npm ci

# -------- Copy Source --------
COPY . .

# -------- Environment --------
ENV NODE_ENV=production
ENV PORT=3000

# -------- Expose Port --------
EXPOSE 3000

# -------- Start Server --------
CMD ["node", "index.js"]
