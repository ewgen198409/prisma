#!/bin/bash
set -e

# Static Prisma site on port 8000
python3 -m http.server 8000 --directory /app/prisma.ws &

# Run Flask media server on port 5000
exec python3 /app/media-server/app.py
