import { useState, useEffect, useRef } from 'react';
import './PDFViewer.css';

export default function PDFViewer({ fileId, fileName, user, onUpgradeClick }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pdfDoc, setPdfDoc] = useState(null);
  const canvasRef = useRef(null);

  // Check if user has premium subscription
  const isPremium = user?.subscription?.status === 'active' || user?.subscription?.status === 'trialing';
  const PAGE_LIMIT = isPremium ? Infinity : 5; // 5 pages for free, unlimited for premium

  // Stream URL directly from server (no blob URL to prevent extraction)
  const pdfUrl = `http://localhost:3002/api/stream?fileId=${fileId}`;

  useEffect(() => {
    // Load PDF.js library dynamically
    const loadPdfJs = async () => {
      if (typeof window !== 'undefined' && !window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          loadPDF();
        };
      } else if (window.pdfjsLib) {
        loadPDF();
      }
    };

    const loadPDF = async () => {
      try {
        const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        renderPage(pdf, 1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPdfJs();
  }, [pdfUrl]);

  const renderPage = async (doc, pageNum) => {
    if (!doc || !canvasRef.current) return;

    try {
      const page = await doc.getPage(pageNum);
      const scale = zoom / 100;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // ⚠️ CRITICAL SECURITY: Disable toDataURL and toBlob to prevent data extraction
      canvas.toDataURL = function() {
        console.warn('⚠️ Data extraction blocked for security');
        return '';
      };
      canvas.toBlob = function() {
        console.warn('⚠️ Data extraction blocked for security');
      };
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  }, [currentPage, zoom, pdfDoc]);

  const nextPage = () => {
    if (currentPage >= PAGE_LIMIT && !isPremium) {
      alert(`📄 Free tier allows viewing up to ${PAGE_LIMIT} pages. Upgrade to Premium for full access!`);
      if (onUpgradeClick) onUpgradeClick();
      return;
    }
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const zoomIn = () => {
    if (zoom < 200) setZoom(zoom + 25);
  };

  const zoomOut = () => {
    if (zoom > 50) setZoom(zoom - 25);
  };

  const preventContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  // Additional protection: Disable text selection and drag
  const preventSelection = (e) => {
    e.preventDefault();
    return false;
  };

  return (
    <div className="custom-pdf-viewer">
      <div className="pdf-toolbar">
        <div className="toolbar-left">
          <button onClick={prevPage} disabled={currentPage === 1} className="pdf-btn">
            ◀ Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
            {!isPremium && ` (Free: ${Math.min(PAGE_LIMIT, totalPages)} pages max)`}
            {isPremium && ` ⭐`}
          </span>
          <button 
            onClick={nextPage} 
            disabled={currentPage === totalPages}
            className="pdf-btn"
            style={{
              opacity: (!isPremium && currentPage >= PAGE_LIMIT) ? 0.5 : 1
            }}
          >
            Next ▶
          </button>
        </div>

        <div className="toolbar-right">
          <button onClick={zoomOut} disabled={zoom === 50} className="pdf-btn">
            −
          </button>
          <span className="zoom-info">{zoom}%</span>
          <button onClick={zoomIn} disabled={zoom === 200} className="pdf-btn">
            +
          </button>
        </div>
      </div>

      <div 
        className="pdf-content" 
        onContextMenu={preventContextMenu}
        onSelectStart={preventSelection}
        onDragStart={preventSelection}
      >
        <canvas 
          ref={canvasRef}
          className="pdf-page"
          onContextMenu={preventContextMenu}
          onSelectStart={preventSelection}
          onDragStart={preventSelection}
        />
      </div>

      <div className="pdf-info">
        <p className="file-name">📄 {fileName}</p>
        <p className="protection-notice">
          🔒 Protected - Cannot be downloaded or printed
          {!isPremium && ` | 📄 Free tier: ${PAGE_LIMIT} pages max`}
          {isPremium && ` | ⭐ Premium - Full Access`}
        </p>
        {!isPremium && currentPage >= PAGE_LIMIT && totalPages > PAGE_LIMIT && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: '10px' }}>
              🔒 Viewing limited to {PAGE_LIMIT} pages on free tier
            </p>
            <button 
              onClick={onUpgradeClick}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              ⭐ Upgrade to Premium to View All {totalPages} Pages
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
