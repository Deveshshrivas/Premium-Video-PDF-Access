import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  encryptionIV: { type: String, required: true },
  encryptionKey: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  chunks: [{ 
    index: Number, 
    filePath: String,
    size: Number,
    authTag: String
  }]
});

export default mongoose.models.File || mongoose.model('File', fileSchema);
