FROM node:20-slim

# Install system deps
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp standalone binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

# Ensure node is discoverable by yt-dlp
ENV PATH="/usr/local/bin:/usr/bin:${PATH}"

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8000
CMD ["node", "index.js"]
