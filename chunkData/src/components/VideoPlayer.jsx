import { useState, useRef, useEffect } from 'react';
import './VideoPlayer.css';

export default function VideoPlayer({ fileId, fileName, user, onUpgradeClick }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [watchedTime, setWatchedTime] = useState(0);
  const [isTimeLimitReached, setIsTimeLimitReached] = useState(false);
  
  // Check if user has premium subscription
  const isPremium = user?.subscription?.status === 'active' || user?.subscription?.status === 'trialing';
  const TIME_LIMIT = isPremium ? Infinity : 10; // Unlimited for premium, 10 seconds for free

  // Stream URL directly from server (no blob URL to prevent bypass)
  const streamUrl = `http://localhost:3002/api/stream?fileId=${fileId}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      
      // Track watched time and enforce 10-second limit
      if (!video.paused && !isTimeLimitReached) {
        setWatchedTime(prev => {
          const newWatchedTime = prev + 0.1; // Approximate increment
          
          if (newWatchedTime >= TIME_LIMIT) {
            video.pause();
            setIsPlaying(false);
            setIsTimeLimitReached(true);
            if (!isPremium) {
              alert(`⏱️ Free tier viewing limit reached! Upgrade to Premium for unlimited access.`);
              if (onUpgradeClick) {
                setTimeout(() => onUpgradeClick(), 500);
              }
            }
            return TIME_LIMIT;
          }
          
          return newWatchedTime;
        });
      }
    };

    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isTimeLimitReached]);

  const togglePlay = () => {
    if (isTimeLimitReached) {
      if (!isPremium) {
        alert(`⭐ Upgrade to Premium for unlimited video access!`);
        if (onUpgradeClick) onUpgradeClick();
      }
      return;
    }

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    if (isTimeLimitReached) {
      alert(`⏱️ Seeking is disabled. Viewing limit of ${TIME_LIMIT} seconds has been reached.`);
      return;
    }
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    videoRef.current.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      videoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changeSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    videoRef.current.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Prevent right-click on video
  const preventContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  return (
    <div className="custom-video-player">
      <div className="video-container">
        <video
          ref={videoRef}
          src={streamUrl}
          onContextMenu={preventContextMenu}
          onClick={togglePlay}
          crossOrigin="anonymous"
        />
        
        {!isPlaying && (
          <div className="play-overlay" onClick={togglePlay}>
            <div className="play-button">▶</div>
          </div>
        )}
      </div>

      <div className="video-controls">
        <div className="progress-bar">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="seek-bar"
          />
          <div 
            className="progress-fill" 
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="controls-bottom">
          <div className="controls-left">
            <button onClick={togglePlay} className="control-btn">
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <button onClick={toggleMute} className="control-btn">
              {isMuted || volume === 0 ? '🔇' : '🔊'}
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-bar"
            />
            
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <span className="watch-time-limit" style={{ 
              marginLeft: '15px', 
              color: watchedTime >= TIME_LIMIT * 0.8 ? '#ff6b6b' : '#ffd93d',
              fontWeight: 'bold',
              display: isPremium ? 'none' : 'inline'
            }}>
              ⏱️ {Math.max(0, TIME_LIMIT - watchedTime).toFixed(1)}s left
            </span>
            
            {isPremium && (
              <span style={{ marginLeft: '15px', color: '#4CAF50', fontWeight: 'bold' }}>
                ⭐ Premium - Unlimited
              </span>
            )}
          </div>

          <div className="controls-right">
            <button onClick={changeSpeed} className="control-btn" disabled={isTimeLimitReached}>
              {playbackRate}x
            </button>
            
            <button onClick={toggleFullscreen} className="control-btn" disabled={isTimeLimitReached}>
              {isFullscreen ? '⊡' : '⛶'}
            </button>
          </div>
        </div>
      </div>

      <div className="video-info">
        <p className="file-name">🎥 {fileName}</p>
        <p className="protection-notice">
          🔒 Protected - Cannot be downloaded or shared
          {!isPremium && ` | ⏱️ ${TIME_LIMIT}s viewing limit`}
          {isPremium && ` | ⭐ Premium - Unlimited Access`}
        </p>
        {isTimeLimitReached && !isPremium && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: '10px' }}>
              ⛔ Free tier limit reached!
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
              ⭐ Upgrade to Premium for Unlimited Access
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
