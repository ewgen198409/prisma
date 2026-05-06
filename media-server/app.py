#!/usr/bin/env python3
"""
Media Server with AC3/AAC Transcoding Support
Transcodes video streams to browser-compatible formats
"""

import os
import sys
import subprocess
import threading
import time
import tempfile
import logging
from pathlib import Path
from urllib.parse import quote, unquote
from datetime import datetime

from flask import Flask, render_template, request, Response, jsonify

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder='templates')

# Configuration
FFMPEG_BIN = '/usr/bin/ffmpeg'
TEMP_DIR = tempfile.gettempdir()
STREAM_TIMEOUT = 300  # 5 minutes
BUFFER_SIZE = 65536  # 64KB
ACTIVE_STREAMS = {}  # Track active streams

# Verify FFmpeg is available
if not os.path.exists(FFMPEG_BIN):
    logger.error(f"FFmpeg not found at {FFMPEG_BIN}")
    sys.exit(1)


class StreamManager:
    """Manage transcoding streams"""
    
    def __init__(self):
        self.streams = {}
        self.lock = threading.Lock()
    
    def register(self, stream_id, process):
        """Register active stream"""
        with self.lock:
            self.streams[stream_id] = {
                'process': process,
                'start_time': time.time(),
                'bytes_sent': 0
            }
    
    def unregister(self, stream_id):
        """Unregister stream and cleanup"""
        with self.lock:
            if stream_id in self.streams:
                stream_info = self.streams[stream_id]
                if stream_info['process']:
                    try:
                        stream_info['process'].terminate()
                        stream_info['process'].wait(timeout=5)
                    except Exception as e:
                        logger.warning(f"Error terminating stream {stream_id}: {e}")
                del self.streams[stream_id]
                logger.info(f"Stream {stream_id} unregistered")
    
    def cleanup_old_streams(self):
        """Remove inactive streams older than STREAM_TIMEOUT"""
        with self.lock:
            now = time.time()
            expired = []
            for sid, info in list(self.streams.items()):
                if now - info['start_time'] > STREAM_TIMEOUT:
                    expired.append(sid)
            
            for sid in expired:
                logger.info(f"Cleaning up expired stream: {sid}")
                stream_info = self.streams[sid]
                if stream_info['process']:
                    try:
                        stream_info['process'].terminate()
                    except:
                        pass
                del self.streams[sid]
    
    def get_stats(self):
        """Get stream statistics"""
        with self.lock:
            return {
                'active_streams': len(self.streams),
                'streams': [
                    {
                        'id': sid,
                        'uptime': int(time.time() - info['start_time']),
                        'bytes_sent': info['bytes_sent']
                    }
                    for sid, info in self.streams.items()
                ]
            }


stream_manager = StreamManager()


def build_ffmpeg_command(input_url, audio_codec='aac', buffer_type='medium'):
    """
    Build FFmpeg transcoding command
    
    Args:
        input_url: Source video URL or file path
        audio_codec: Target audio codec (aac, libmp3lame, libopus, pcm_s16le)
        buffer_type: Buffer size preset (small, medium, large)
    
    Returns:
        List of command arguments
    """
    
    # Audio codec mappings
    codec_options = {
        'aac': {
            'codec': 'aac',
            'bitrate': '128k',
            'frequency': '44100'
        },
        'libmp3lame': {
            'codec': 'libmp3lame',
            'bitrate': '128k',
            'frequency': '44100'
        },
        'libopus': {
            'codec': 'libopus',
            'bitrate': '128k',
            'frequency': '44100'
        },
        'pcm_s16le': {
            'codec': 'pcm_s16le',
            'bitrate': None,
            'frequency': '44100'
        }
    }
    
    codec_config = codec_options.get(audio_codec, codec_options['aac'])
    
    ffmpeg_buffer_map = {
        'small': '32k',
        'medium': '64k',
        'large': '128k'
    }
    buffer_value = ffmpeg_buffer_map.get(buffer_type, '64k')
    
    cmd = [
        FFMPEG_BIN,
        '-hide_banner',
        '-loglevel', 'error',
        '-i', input_url,
        
        # Video settings (transcode to H.264 for browser compatibility)
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',  # Quality setting (lower = better quality)
        '-bufsize', buffer_value,
        '-rtbufsize', buffer_value,
        
        # Audio settings (transcode)
        '-c:a', codec_config['codec'],
    ]
    
    if codec_config['bitrate']:
        cmd.extend(['-b:a', codec_config['bitrate']])
    
    cmd.extend([
        '-ar', codec_config['frequency'],
        '-ac', '2',  # Stereo
        
        # Output format (MP4 for browser compatibility)
        '-f', 'mp4',
        '-movflags', 'frag_keyframe+empty_moov',  # Streaming flags
        'pipe:1'  # Output to stdout
    ])
    
    return cmd


@app.route('/')
def index():
    """Serve the player HTML"""
    return render_template('player.html')


@app.route('/play')
def play_redirect():
    """
    Integration endpoint for Prisma player_torrent setting
    Redirects to web player with autoplay parameters
    """
    video_url = request.args.get('url', '').strip()
    audio_codec = request.args.get('codec', 'aac')
    buffer_type = request.args.get('buffer', 'medium')
    
    if not video_url:
        return jsonify({'error': 'Missing URL parameter'}), 400
    
    # Redirect to player with autoplay
    return render_template(
        'player.html',
        initial_url=video_url,
        initial_codec=audio_codec,
        initial_buffer=buffer_type
    )


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'ffmpeg_available': os.path.exists(FFMPEG_BIN),
        'streams': stream_manager.get_stats()
    })


@app.route('/api/stream')
def stream():
    """
    Stream endpoint - transcodes video to browser-compatible format
    
    Query params:
        url: Source video URL (required)
        codec: Audio codec (default: aac)
        sid: Stream ID (for tracking)
    """
    try:
        video_url = request.args.get('url', '').strip()
        audio_codec = request.args.get('codec', 'aac')
        stream_id = request.args.get('sid', f'stream_{int(time.time())}')
        
        if not video_url:
            return jsonify({'error': 'Missing URL parameter'}), 400
        
        # Validate codec
        valid_codecs = ['aac', 'libmp3lame', 'libopus', 'pcm_s16le']
        if audio_codec not in valid_codecs:
            audio_codec = 'aac'
        
        logger.info(f"Stream request - URL: {video_url[:80]}... Codec: {audio_codec} ID: {stream_id}")
        
        buffer_type = request.args.get('buffer', 'medium')
        buffer_map = {
            'small': 32768,
            'medium': 65536,
            'large': 131072
        }
        chunk_size = buffer_map.get(buffer_type, BUFFER_SIZE)
        
        # Build FFmpeg command
        cmd = build_ffmpeg_command(video_url, audio_codec, buffer_type)
        logger.debug(f"FFmpeg command: {' '.join(cmd)}")
        
        # Start FFmpeg process
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=chunk_size
            )
        except Exception as e:
            logger.error(f"Failed to start FFmpeg: {e}")
            return jsonify({'error': f'FFmpeg error: {str(e)}'}), 500
        
        # Register stream
        stream_manager.register(stream_id, process)
        
        def generate():
            """Generator for streaming response"""
            try:
                while True:
                    chunk = process.stdout.read(chunk_size)
                    if not chunk:
                        break
                    
                    # Update bytes sent
                    with stream_manager.lock:
                        if stream_id in stream_manager.streams:
                            stream_manager.streams[stream_id]['bytes_sent'] += len(chunk)
                    
                    yield chunk
            
            except GeneratorExit:
                logger.info(f"Stream {stream_id} closed by client")
            
            except Exception as e:
                logger.error(f"Stream error {stream_id}: {e}")
            
            finally:
                stream_manager.unregister(stream_id)
        
        # Return streaming response
        response = Response(
            generate(),
            mimetype='video/mp4',
            headers={
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        )
        
        return response
    
    except Exception as e:
        logger.error(f"Stream endpoint error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/cleanup', methods=['POST', 'GET'])
def cleanup():
    """Cleanup old streams"""
    stream_manager.cleanup_old_streams()
    stats = stream_manager.get_stats()
    return jsonify({
        'status': 'cleaned',
        'stats': stats
    })


@app.route('/api/stats')
def stats():
    """Get stream statistics"""
    return jsonify(stream_manager.get_stats())


def cleanup_handler():
    """Periodic cleanup of old streams"""
    while True:
        try:
            time.sleep(60)
            stream_manager.cleanup_old_streams()
        except Exception as e:
            logger.error(f"Cleanup error: {e}")


if __name__ == '__main__':
    # Start background cleanup thread
    cleanup_thread = threading.Thread(target=cleanup_handler, daemon=True)
    cleanup_thread.start()
    
    logger.info("=" * 60)
    logger.info("Media Server with AC3/AAC Transcoding")
    logger.info("=" * 60)
    logger.info(f"FFmpeg: {FFMPEG_BIN}")
    logger.info(f"Temp directory: {TEMP_DIR}")
    logger.info(f"Stream timeout: {STREAM_TIMEOUT}s")
    logger.info(f"Buffer size: {BUFFER_SIZE} bytes")
    logger.info("=" * 60)
    logger.info("Starting Flask server on http://0.0.0.0:5000")
    logger.info("Open http://localhost:5000 in browser")
    logger.info("=" * 60)
    
    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True,
        use_reloader=False
    )
