import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import File from '@/models/File';

// Handle CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range, X-Requested-With, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function decryptChunk(encrypted, key, iv, authTag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Check referer to prevent external link sharing
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    
    // Only allow requests from localhost (your app)
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
    const isValidOrigin = origin && allowedOrigins.includes(origin);
    const isValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed));
    
    if (!isValidOrigin && !isValidReferer) {
      return NextResponse.json({ 
        error: 'Access denied - Direct links are not allowed. Please access files through the application.' 
      }, { 
        status: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    const fileDoc = await File.findOne({ fileId });
    if (!fileDoc) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Decrypt all chunks and combine into full file
    const iv = Buffer.from(fileDoc.encryptionIV, 'hex');
    
    // Sort chunks by index
    const sortedChunks = fileDoc.chunks.sort((a, b) => a.index - b.index);
    
    // Decrypt and combine all chunks (each chunk has its own auth tag)
    const decryptedChunks = [];
    for (const chunk of sortedChunks) {
      const encryptedBuffer = await readFile(chunk.filePath);
      const authTag = Buffer.from(chunk.authTag, 'hex');
      const decrypted = decryptChunk(encryptedBuffer, fileDoc.encryptionKey, iv, authTag);
      decryptedChunks.push(decrypted);
    }
    
    const fullFile = Buffer.concat(decryptedChunks);
    const fileSize = fullFile.length;
    
    // Get range header for partial content (YouTube-style streaming)
    const range = request.headers.get('range');
    
    // For video files, implement dynamic chunk sizing (7-10 seconds worth of data)
    const isVideo = fileDoc.fileType.startsWith('video/');
    
    if (range) {
      // Parse range header (e.g., "bytes=0-1024")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      // For video streaming, limit chunk size to simulate 7-10 seconds
      if (isVideo && !parts[1]) {
        // Random chunk size between 7-10 seconds worth of data
        // Estimate: ~1MB per second for standard quality video
        const secondsOfData = Math.floor(Math.random() * 4) + 7; // Random 7-10 seconds
        const estimatedBytesPerSecond = 1024 * 1024; // 1MB/sec estimate
        const maxChunkSize = secondsOfData * estimatedBytesPerSecond;
        
        end = Math.min(start + maxChunkSize - 1, fileSize - 1);
        
        console.log(`📦 Streaming chunk: ${secondsOfData}s worth of data (${((end - start + 1) / 1024 / 1024).toFixed(2)}MB)`);
      }
      
      const chunksize = (end - start) + 1;
      const fileChunk = fullFile.slice(start, end + 1);
      
      return new NextResponse(fileChunk, {
        status: 206, // Partial Content
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': fileDoc.fileType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'",
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
          'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
        }
      });
    } else {
      // For initial request without range, send a small chunk to start
      if (isVideo) {
        const initialSeconds = Math.floor(Math.random() * 4) + 7; // Random 7-10 seconds
        const estimatedBytesPerSecond = 1024 * 1024;
        const initialChunkSize = Math.min(initialSeconds * estimatedBytesPerSecond, fileSize);
        const initialChunk = fullFile.slice(0, initialChunkSize);
        
        console.log(`📦 Initial video chunk: ${initialSeconds}s worth of data (${(initialChunkSize / 1024 / 1024).toFixed(2)}MB)`);
        
        return new NextResponse(initialChunk, {
          status: 206,
          headers: {
            'Content-Range': `bytes 0-${initialChunkSize - 1}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': initialChunkSize.toString(),
            'Content-Type': fileDoc.fileType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'self'",
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
          }
        });
      }
      
      // Send full file for non-video files
      return new NextResponse(fullFile, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': fileDoc.fileType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'",
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
          'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
        }
      });
    }
    
  } catch (error) {
    console.error('Stream error:', error);
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
