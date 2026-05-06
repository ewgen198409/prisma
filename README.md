docker build -t prisma-media .
docker stop prisma-media
docker rm prisma-media
docker run -d --name prisma-media -p 5000:5000 -p 8000:8000 prisma-media

Веб на порту :8000
