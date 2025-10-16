export default function Home() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>🔒 Secure File Streaming Server</h1>
      <p>Server is running. Use the client app to upload files.</p>
      <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>API Endpoints:</h3>
        <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
          <li><code>POST /api/upload</code> - Upload chunks</li>
          <li><code>GET /api/stream?fileId=xxx</code> - Stream files</li>
          <li><code>GET /api/files</code> - List uploaded files</li>
        </ul>
      </div>
    </div>
  );
}