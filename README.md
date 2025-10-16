# 🔒 Secure File Chunking System

## ✅ Setup Complete!

### Architecture
- **Backend (Next.js)**: Running on `http://localhost:3001`
- **Frontend (React + Vite)**: Running on `http://localhost:5174`
- **Database**: MongoDB Atlas
- **Storage**: Local encrypted chunks in `server/uploads/chunks/`

### Features
✅ **Chunked Upload** - Files split into 1MB pieces
✅ **AES-256-GCM Encryption** - Each chunk encrypted individually
✅ **MongoDB Metadata** - File info stored in database
✅ **Stream Playback** - Video/PDF/Audio without download
✅ **Progress Tracking** - Real-time upload progress
✅ **File Library** - Browse all uploaded files

---

## 🚀 How to Use

### 1. Open the Client App
Visit: **http://localhost:5174**

### 2. Upload a File
1. Click "Choose File to Upload"
2. Select a video, PDF, or audio file
3. Watch the progress bar
4. File automatically appears in the list

### 3. Play/Preview Files
- Click on any file in the list
- Video/Audio plays in browser
- PDF displays in iframe
- **No download button** - secure streaming only

---

## 📁 Project Structure

### Backend (`server/`)
```
server/
├── .env.local                    # MongoDB connection
├── src/
│   ├── lib/
│   │   └── mongodb.js           # Database connection
│   ├── models/
│   │   └── File.js              # File schema
│   └── app/
│       ├── page.js              # Server homepage
│       └── api/
│           ├── upload/route.js  # Upload endpoint
│           ├── stream/route.js  # Streaming endpoint
│           └── files/route.js   # List files endpoint
└── uploads/chunks/              # Encrypted chunks storage
```

### Frontend (`chunkData/`)
```
chunkData/
└── src/
    ├── App.jsx                  # Main upload UI
    └── App.css                  # Styling
```

---

## 🔐 Security Features

1. **Client-Side Chunking**: Files split before upload
2. **AES-256-GCM Encryption**: Military-grade encryption per chunk
3. **Unique Keys**: Each file gets unique encryption key
4. **IV & Auth Tags**: Prevents tampering
5. **No Direct Download**: Files stream decrypted on-the-fly
6. **MongoDB**: Metadata stored securely

---

## 📡 API Endpoints

### POST `/api/upload`
Upload a single encrypted chunk
```javascript
FormData:
- chunk: Blob
- chunkIndex: number
- totalChunks: number
- fileId: string
- fileName: string
- fileType: string
- fileSize: number
```

### GET `/api/stream?fileId={id}&chunkIndex={index}`
Stream a decrypted chunk
```javascript
Response: Binary data (video/audio/pdf)
Headers:
- Content-Type: file mime type
- X-Total-Chunks: total chunks count
```

### GET `/api/files`
Get list of all uploaded files
```javascript
Response: { files: Array }
```

---

## 🛠️ Technologies Used

**Backend:**
- Next.js 15
- Node.js crypto (AES-256-GCM)
- MongoDB + Mongoose
- File System API

**Frontend:**
- React 18
- Vite
- File API
- Fetch API

---

## 🎯 Next Steps

1. **Add Authentication**: User login/signup
2. **File Sharing**: Generate secure share links
3. **Download with Auth**: Allow authorized downloads
4. **Resume Uploads**: Handle interrupted uploads
5. **Compression**: Add gzip before encryption
6. **CDN**: Move to cloud storage (AWS S3)

---

## 📝 Environment Variables

Add to `server/.env.local`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
ENCRYPTION_KEY=your_64_character_hex_key
```

---

## 🐛 Troubleshooting

**Upload fails?**
- Check server terminal for errors
- Verify MongoDB connection
- Check browser console

**Can't play video?**
- Ensure browser supports the video codec
- Check Content-Type header in stream response

**CORS errors?**
- Both servers must be running
- Check API_URL in App.jsx matches backend port

---

## 💡 Usage Example

```javascript
// Upload flow
1. User selects 5MB video
2. Split into 5 chunks (1MB each)
3. Each chunk encrypted with AES-256-GCM
4. Sent to /api/upload one by one
5. Server saves encrypted chunks
6. Metadata saved to MongoDB
7. FileID returned to client

// Stream flow
1. User clicks file in list
2. Client requests /api/stream?fileId=xxx
3. Server reads encrypted chunks
4. Decrypts on-the-fly
5. Streams to video player
6. User watches without downloading
```

---

## 🎉 You're Ready!

Your secure file chunking system is fully operational. Upload some files and test the streaming!

**Servers Running:**
- Backend: http://localhost:3001
- Frontend: http://localhost:5174

**Happy Streaming! 🚀**
