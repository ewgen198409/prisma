FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg vlc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY media-server/requirements.txt ./media-server/requirements.txt
RUN pip install --no-cache-dir -r media-server/requirements.txt

COPY media-server ./media-server
COPY site-mirror-prisma.ws/prisma.ws ./prisma.ws

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 5000 8000

CMD ["./docker-entrypoint.sh"]
