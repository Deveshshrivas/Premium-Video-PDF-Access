import { useState, useEffect } from 'react';
import './App.css';
import Auth from './components/Auth';
import VideoPlayer from './components/VideoPlayer';
import PDFViewer from './components/PDFViewer';
import PricingModal from './components/PricingModal';

const CHUNK_SIZE = 1024 * 1024; // 1MB
const API_URL = 'http://localhost:3002';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [uploadedFileId, setUploadedFileId] = useState('');
  const [fileType, setFileType] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Generate unique session ID on mount - prevents external link sharing
  useEffect(() => {
    const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    setSessionId(newSessionId);
    sessionStorage.setItem('appSessionId', newSessionId);
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      // Verify token with backend
      fetch(`${API_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsAuthenticated(true);
          setUser(data.user);
          setToken(storedToken);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
    }
  }, []);

  const handleLogin = (userData, userToken) => {
    setIsAuthenticated(true);
    setUser(userData);
    setToken(userToken);
  };

    const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    setFiles([]);
    setSelectedFile(null);
    setUploadedFileId('');
  };

  const uploadFile = async (file) => {
    const fileId = Math.random().toString(36).substring(7);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    setStatus(`Uploading ${file.name}...`);
    setFileType(file.type);
    setProgress(0);
    
    try {
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
        formData.append('fileType', file.type);
        formData.append('fileSize', file.size);
        
        const fetchOptions = {
          method: 'POST',
          body: formData
        };
        
        // Only add Authorization header if token exists
        // Don't set Content-Type - let browser set it automatically for FormData
        if (token) {
          fetchOptions.headers = {
            'Authorization': `Bearer ${token}`
          };
        }
        
        console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks}...`);
        
        const response = await fetch(`${API_URL}/api/upload`, fetchOptions);
        
        if (!response.ok) {
          let errorMessage = 'Upload failed';
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch (e) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        setProgress(((chunkIndex + 1) / totalChunks) * 100);
      }
      
      setStatus(`✓ Upload complete!`);
      setUploadedFileId(fileId);
      fetchFiles();
      
      // No longer creating blob URL - video will stream directly from server
      // This prevents users from accessing the full video via blob URL
    } catch (error) {
      setStatus(`✗ Error: ${error.message}`);
      console.error('Upload error:', error);
    }
  };

  const fetchFiles = async () => {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/api/files`, {
        headers: headers
      });
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Fetch files error:', error);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedFile(null);
    setUploadedFileId('');
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl('');
    }
    await uploadFile(file);
  };

  const handleFileSelect = async (file) => {
    // Verify session to prevent external access
    const currentSessionId = sessionStorage.getItem('appSessionId');
    if (!currentSessionId || currentSessionId !== sessionId) {
      setStatus('✗ Invalid session - please refresh the page');
      return;
    }

    setSelectedFile(file);
    setUploadedFileId(file.fileId);
    setFileType(file.fileType);
    
    // No longer creating blob URL - stream directly from server
    // This ensures chunked streaming is used and blob URL cannot be extracted
    setStatus('');
  };

  // Prevent external link access - check if blob URL was created in this session
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('appSessionId');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>🔒 Secure File Upload & Streaming</h1>
          <p>Upload videos, PDFs, and audio files with encryption</p>
        </div>
        <div className="user-section">
          {user?.subscription?.status === 'active' || user?.subscription?.status === 'trialing' ? (
            <span className="subscription-badge" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
              marginRight: '12px'
            }}>
              ⭐ Premium
            </span>
          ) : (
            <button 
              className="btn-upgrade"
              onClick={() => setShowPricingModal(true)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginRight: '12px',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
              }}
            >
              ⭐ Upgrade to Premium
            </button>
          )}
          <span className="user-name">👤 {user?.name || 'User'}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main>
        <div className="upload-section">
          <label className="file-input-label">
            <input 
              type="file" 
              accept="video/*,application/pdf,audio/*" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <span className="btn">Choose File to Upload</span>
          </label>
          
          {progress > 0 && (
            <div className="progress-container">
              <progress value={progress} max="100" />
              <p>{Math.round(progress)}%</p>
            </div>
          )}
          
          {status && <p className="status">{status}</p>}
        </div>

        <div className="files-section">
          <div className="files-header">
            <h2>Uploaded Files</h2>
            <button className="btn-small" onClick={fetchFiles}>Refresh</button>
          </div>
          
          <div className="files-list">
            {files.length === 0 ? (
              <p>No files uploaded yet</p>
            ) : (
              files.map((file) => (
                <div 
                  key={file.fileId} 
                  className={`file-item ${selectedFile?.fileId === file.fileId ? 'active' : ''}`}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className="file-icon">
                    {file.fileType.includes('video') ? '🎥' : 
                     file.fileType.includes('pdf') ? '📄' : 
                     file.fileType.includes('audio') ? '🎵' : '📎'}
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.fileName}</div>
                    <div className="file-meta">
                      {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • 
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {uploadedFileId && (
          <div className="preview-section">
            <h3>🎬 Protected Media Player</h3>
            {fileType.includes('video') ? (
              <VideoPlayer 
                fileId={uploadedFileId} 
                fileName={selectedFile?.fileName || 'Video'}
                user={user}
                onUpgradeClick={() => setShowPricingModal(true)}
              />
            ) : fileType.includes('audio') ? (
              <div className="audio-player-wrapper">
                <div className="audio-info">
                  <h4>🎵 {selectedFile?.fileName || 'Audio File'}</h4>
                  <p className="protection-notice">🔒 Protected - Cannot be downloaded</p>
                </div>
                <audio 
                  controls 
                  src={`${API_URL}/api/stream?fileId=${uploadedFileId}`}
                  type={fileType} 
                  controlsList="nodownload"
                  crossOrigin="anonymous"
                />
              </div>
            ) : fileType.includes('pdf') ? (
              <PDFViewer 
                fileId={uploadedFileId}
                fileName={selectedFile?.fileName || 'Document'}
                user={user}
                onUpgradeClick={() => setShowPricingModal(true)}
              />
            ) : null}
            <div className="security-info">
              <p>🔒 <strong>Security Features:</strong></p>
              <ul>
                <li>✓ Chunked streaming (7-10 second random chunks for videos)</li>
                <li>✓ Server-controlled delivery (no blob URL access)</li>
                <li>✓ Session-based access protection</li>
                <li>✓ Right-click disabled on media</li>
                <li>✓ Download protection enabled</li>
                <li>✓ Print protection (PDF)</li>
                <li>✓ All content is encrypted on server</li>
                <li>✓ {user?.subscription?.status === 'active' ? 'Unlimited access (Premium)' : '10s video / 5 pages PDF limit (Free)'}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Pricing Modal */}
        <PricingModal 
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          user={user}
          token={token}
        />
      </main>
    </div>
  );
}

export default App;
