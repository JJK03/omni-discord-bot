FROM node:20-slim

# 음성, TTS, 유튜브 처리를 위한 시스템 의존성
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp 설치
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

RUN ln -s /usr/local/bin/node /usr/local/bin/nodejs || true

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node_modules/.bin/tsx", "src/index.ts"]
