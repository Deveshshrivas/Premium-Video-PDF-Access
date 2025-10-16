'use client';
import { useState } from 'react';
import crypto from 'crypto-js';

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

export default function FileUploader() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  
  const uploadFile = async (file) => {
    const fileId = crypto.lib.WordArray.random(16).toString();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    setStatus(`Uploading ${file.name}...`);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', chunkIndex);
      formData.append('totalChunks', totalChunks);
      formData.append('fileId', fileId);
      formData.append('fileName', file.name);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      setProgress(((chunkIndex + 1) / totalChunks) * 100);
    }
    
    setStatus(`✓ Upload complete! File ID: ${fileId}`);
    return fileId;
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      await uploadFile(file);
    } catch (error) {
      setStatus(`✗ Error: ${error.message}`);
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>Secure File Upload</h2>
      <input type="file" onChange={handleFileChange} />
      {progress > 0 && (
        <div>
          <progress value={progress} max="100" style={{ width: '100%', marginTop: '10px' }} />
          <p>{Math.round(progress)}%</p>
        </div>
      )}
      <p>{status}</p>
    </div>
  );
}