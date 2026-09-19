FROM oven/bun:alpine

RUN apk add --no-cache python3 py3-pip ffmpeg

RUN pip install --break-system-packages -U yt-dlp

ENV BINARY_PATH="/usr/bin/yt-dlp"

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN mkdir -p /app/downloads

EXPOSE 3000

CMD ["bun", "run", "index.ts"]

