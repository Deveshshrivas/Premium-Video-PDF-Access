import { NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const CHUNK_DIR = path.join(process.cwd(), 'chunks');

// Decrypt chunk
function decryptChunk(encrypted, key, iv, authTag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const chunkIndex = parseInt(searchParams.get('chunkIndex'));
    
    if (!fileId || isNaN(chunkIndex)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const encryptionKey = crypto.scryptSync(fileId, 'salt', 32);
    
    const chunkPath = path.join(CHUNK_DIR, `${fileId}_chunk_${chunkIndex}.enc`);
    const metaPath = path.join(CHUNK_DIR, `${fileId}_chunk_${chunkIndex}.meta`);
    
    const encrypted = await readFile(chunkPath);
    const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
    
    const decrypted = decryptChunk(encrypted, encryptionKey, meta.iv, meta.authTag);
    
    return new NextResponse(decrypted, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Chunk-Index': chunkIndex.toString(),
        'X-Total-Chunks': meta.totalChunks.toString(),
        'X-File-Name': meta.fileName
      }
    });
    
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}