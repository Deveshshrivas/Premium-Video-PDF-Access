import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import File from '@/models/File';

const CHUNK_DIR = path.join(process.cwd(), 'uploads', 'chunks');

// Handle CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function ensureDir() {
  if (!existsSync(CHUNK_DIR)) await mkdir(CHUNK_DIR, { recursive: true });
}

function encryptChunk(buffer, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encrypted, authTag };
}

export async function POST(request) {
  try {
    await ensureDir();
    await dbConnect();
    
    const formData = await request.formData();
    const chunk = formData.get('chunk');
    const chunkIndex = parseInt(formData.get('chunkIndex'));
    const totalChunks = parseInt(formData.get('totalChunks'));
    const fileId = formData.get('fileId');
    const fileName = formData.get('fileName');
    const fileType = formData.get('fileType') || 'application/octet-stream';
    const fileSize = parseInt(formData.get('fileSize') || '0');
    
    const buffer = Buffer.from(await chunk.arrayBuffer());
    
    // Get or create file document
    let fileDoc = await File.findOne({ fileId });
    let iv, encryptionKey;
    
    if (!fileDoc) {
      iv = crypto.randomBytes(16);
      encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
      
      fileDoc = new File({
        fileId,
        fileName,
        fileType,
        fileSize,
        encryptionIV: iv.toString('hex'),
        encryptionKey: encryptionKey,
        chunks: []
      });
    } else {
      iv = Buffer.from(fileDoc.encryptionIV, 'hex');
      encryptionKey = fileDoc.encryptionKey;
    }
    
    // Encrypt chunk
    const { encrypted, authTag } = encryptChunk(buffer, encryptionKey, iv);
    
    // Save to local disk
    const chunkPath = path.join(CHUNK_DIR, `${fileId}_chunk_${chunkIndex}.enc`);
    await writeFile(chunkPath, encrypted);
    
    // Save chunk metadata with its own auth tag
    fileDoc.chunks.push({
      index: chunkIndex,
      filePath: chunkPath,
      size: encrypted.length,
      authTag: authTag.toString('hex')
    });
    
    await fileDoc.save();
    
    console.log(`✓ Chunk ${chunkIndex + 1}/${totalChunks} uploaded for ${fileName}`);
    
    return NextResponse.json({
      success: true,
      chunkIndex,
      totalChunks,
      fileId,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      },
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}