# 🎬 Media Server with AC3/AAC Transcoding Support

Flask-based media streaming server that transcodes video to browser-compatible formats with AC3/AAC audio codec support.

## Features

✅ **AC3 to AAC Transcoding** - Convert Dolby Digital audio to browser-friendly format  
✅ **Multiple Audio Codecs** - AAC, MP3 (libmp3lame), Opus, PCM support  
✅ **FFmpeg Integration** - Video codec support via FFmpeg  
✅ **Video.js Player** - Modern browser player with controls  
✅ **VLC Integration** - Открывать поток напрямую в локальном VLC-клиенте  
✅ **Real-time Streaming** - Stream video while transcoding  
✅ **Stream Management** - Automatic cleanup of old/inactive streams  
✅ **Health Monitoring** - Status and statistics endpoints  

## Requirements

- Python 3.7+
- FFmpeg 4.0+
- Flask 3.0+

### System Setup

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg python3 python3-pip

# Fedora/RHEL
sudo dnf install ffmpeg python3 python3-pip

# macOS
brew install ffmpeg python3
```

## Installation

```bash
# Navigate to media-server directory
cd /home/afanasiy/Desktop/prisma/media-server

# Install Python dependencies
pip3 install -r requirements.txt

# Or install manually
pip3 install Flask==3.0.0 Werkzeug==3.0.0
```

## Usage

### Start the Server

```bash
cd /home/afanasiy/Desktop/prisma/media-server
python3 app.py
```

Server will start on `http://localhost:5000`

### Open in Browser

```
http://localhost:5000
```

### API Endpoints

#### 1. Player UI
```
GET /
```
Returns HTML player interface with Video.js

#### 2. Stream Video
```
GET /api/stream?url=<video_url>&codec=<codec>&sid=<stream_id>
```

**Parameters:**
- `url` (required): Source video URL (HTTP/HTTPS or local path)
- `codec` (optional): Audio codec - `aac` (default), `libmp3lame`, `libopus`, `pcm_s16le`
- `sid` (optional): Stream ID for tracking

**Examples:**
```
http://localhost:5000/api/stream?url=https://example.com/video.mkv&codec=aac
http://localhost:5000/api/stream?url=file:///home/video.mp4&codec=libmp3lame
```

**Response:** Binary MP4 stream with transcoded audio

#### 3. Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-05-06T19:15:00.123456",
  "ffmpeg_available": true,
  "streams": {
    "active_streams": 1,
    "streams": [
      {
        "id": "stream_1234567890",
        "uptime": 45,
        "bytes_sent": 52428800
      }
    ]
  }
}
```

#### 4. Stream Statistics
```
GET /api/stats
```

**Response:**
```json
{
  "active_streams": 2,
  "streams": [
    {
      "id": "stream_1",
      "uptime": 120,
      "bytes_sent": 104857600
    },
    {
      "id": "stream_2",
      "uptime": 45,
      "bytes_sent": 52428800
    }
  ]
}
```

#### 5. Cleanup
```
GET /api/cleanup
POST /api/cleanup
```

Manually trigger cleanup of expired streams (older than 5 minutes)

**Response:**
```json
{
  "status": "cleaned",
  "stats": {
    "active_streams": 1,
    "streams": [...]
  }
}
```

## Configuration

Edit `app.py` to customize:

```python
STREAM_TIMEOUT = 300      # Stream timeout in seconds (default: 5 min)
BUFFER_SIZE = 65536       # Read buffer size in bytes (default: 64KB)
FFMPEG_BIN = '/usr/bin/ffmpeg'  # FFmpeg executable path
```

## Supported Audio Codecs

| Codec | FFmpeg Name | Notes |
|-------|------------|-------|
| **AAC** | `aac` | Recommended, browser-native support |
| **MP3** | `libmp3lame` | Wide compatibility |
| **Opus** | `libopus` | Modern, efficient |
| **PCM** | `pcm_s16le` | Uncompressed, high quality |

## Supported Video Formats

### Input (FFmpeg supported)
- MP4, MKV, WebM, AVI, MOV, FLV, WMV, etc.

### Output (Browser compatible)
- H.264 (VP8 for WebM)
- AAC audio (transcoded from any codec)

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome/Chromium | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full (iOS 10+) |
| Edge | ✅ Full |
| Opera | ✅ Full |

## Performance Tips

1. **Use AAC codec** - Most efficient and widely supported
2. **Local files** - Much faster than streaming from remote URLs
3. **Network bandwidth** - Ensure sufficient upload bandwidth for transcoding
4. **CPU** - FFmpeg transcoding is CPU-intensive, use `-preset fast` or `ultrafast` for live streaming

## Troubleshooting

### FFmpeg not found
```
ERROR: FFmpeg not found at /usr/bin/ffmpeg
```
Install FFmpeg or verify the path in `app.py`

### Port already in use
```
Address already in use
```
Change port in `app.py`:
```python
app.run(host='0.0.0.0', port=8888)  # Use different port
```

### Video won't play
1. Check browser console (F12) for errors
2. Verify source URL is accessible
3. Check `/health` endpoint for FFmpeg availability
4. Review server logs

### Audio codec not supported
If FFmpeg doesn't support a codec:
```bash
ffmpeg -codecs | grep <codec_name>
```
May need to install additional audio libraries

## Integration with Static Site

Serve both media server and static site:

```bash
# Terminal 1: Static site on port 9595
cd /home/afanasiy/Desktop/prisma/site-mirror-prisma.ws/prisma.ws
python3 -m http.server 9595

# Terminal 2: Media server on port 5000
cd /home/afanasiy/Desktop/prisma/media-server
python3 app.py
```

Then access:
- Static site: `http://localhost:9595`
- Media server: `http://localhost:5000`

## Logging

Server logs are displayed in console with timestamps:

```
2024-05-06 19:15:00,123 - INFO - ==================================================
2024-05-06 19:15:00,123 - INFO - Media Server with AC3/AAC Transcoding
2024-05-06 19:15:00,123 - INFO - ==================================================
2024-05-06 19:15:00,123 - INFO - Stream request - URL: https://example.com/video.mkv... Codec: aac ID: stream_1234567890
```

## Advanced Usage

### Command-line Transcoding Test

```bash
# Test FFmpeg directly
ffmpeg -i "https://example.com/video.mkv" \
  -c:v copy \
  -c:a aac -b:a 128k \
  -f mp4 -movflags frag_keyframe+empty_moov \
  pipe:1 > output.mp4
```

### Docker Deployment (Optional)

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["python3", "app.py"]
```

Build and run:
```bash
docker build -t media-server .
docker run -p 5000:5000 media-server
```

## License

MIT

## Support

For issues or questions:
1. Check server logs for error messages
2. Test FFmpeg directly: `ffmpeg -i <url>`
3. Verify network connectivity to source URL
4. Check system resources (CPU, memory)
