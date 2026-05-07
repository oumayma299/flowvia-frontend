import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Maximize, Volume2, VolumeX, RotateCcw } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://backend-jpbe.onrender.com/api';
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
const CLOUDINARY_PLAYER_CSS_ID = 'cld-video-player-css';
const CLOUDINARY_PLAYER_SCRIPT_ID = 'cld-video-player-script';

const resolveVideoSrc = (videoPath) => {
  if (!videoPath) return '';
  if (/^https?:\/\//i.test(videoPath)) return videoPath;
  const normalizedPath = videoPath.startsWith('/') ? videoPath : `/${videoPath}`;
  return `${BACKEND_ORIGIN}${normalizedPath}`;
};

const isCloudinaryUrl = (url = '') => String(url).toLowerCase().includes('res.cloudinary.com');

const ensureCloudinaryPlayerAssets = () => {
  if (!document.getElementById(CLOUDINARY_PLAYER_CSS_ID)) {
    const link = document.createElement('link');
    link.id = CLOUDINARY_PLAYER_CSS_ID;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/cloudinary-video-player@2.2.0/dist/cld-video-player.min.css';
    document.head.appendChild(link);
  }

  if (window.cloudinary?.videoPlayer) return Promise.resolve();

  const existingScript = document.getElementById(CLOUDINARY_PLAYER_SCRIPT_ID);
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = CLOUDINARY_PLAYER_SCRIPT_ID;
    script.src = 'https://unpkg.com/cloudinary-video-player@2.2.0/dist/cld-video-player.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

const parseCloudinaryVideoInfo = (url) => {
  try {
    const parsed = new URL(url);
    const cloudNameMatch = parsed.pathname.match(/^\/([^/]+)\/video\/upload\//i);
    if (!cloudNameMatch) return null;

    let publicPath = parsed.pathname.split('/video/upload/')[1] || '';
    publicPath = publicPath.replace(/^v\d+\//, '');
    publicPath = decodeURIComponent(publicPath).replace(/\.[^/.?]+$/, '');
    if (!publicPath) return null;

    return {
      cloudName: cloudNameMatch[1],
      publicId: publicPath,
    };
  } catch (e) {
    return null;
  }
};

const VideoPlayer = ({ videoPath, title }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [cloudinaryReady, setCloudinaryReady] = useState(false);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const hideTimeout = useRef(null);
  const cloudinaryVideoRef = useRef(null);
  const cloudinaryPlayerRef = useRef(null);

  const isCloudinary = isCloudinaryUrl(videoPath);
  const reactPlayerUrl = resolveVideoSrc(videoPath);
  const cloudinaryInfo = isCloudinary ? parseCloudinaryVideoInfo(reactPlayerUrl) : null;
  const cloudinaryCloudName = cloudinaryInfo?.cloudName || '';
  const cloudinaryPublicId = cloudinaryInfo?.publicId || '';

  useEffect(() => {
    setIsLoading(true);
  }, [videoPath]);

  useEffect(() => {
    if (!isCloudinary || !cloudinaryCloudName || !cloudinaryPublicId || !cloudinaryVideoRef.current) return undefined;

    let cancelled = false;
    setCloudinaryReady(false);

    ensureCloudinaryPlayerAssets()
      .then(() => {
        if (cancelled || !window.cloudinary?.videoPlayer || !cloudinaryVideoRef.current) return;

        if (cloudinaryPlayerRef.current?.dispose) {
          cloudinaryPlayerRef.current.dispose();
        }

        const player = window.cloudinary.videoPlayer(cloudinaryVideoRef.current, {
          cloud_name: cloudinaryCloudName,
          controls: true,
          fluid: true,
          muted: false,
          autoplay: false,
          preload: 'auto',
        });

        cloudinaryPlayerRef.current = player;
        player.source(cloudinaryPublicId);
        player.on('loadeddata', () => setIsLoading(false));
        player.on('waiting', () => setIsLoading(true));
        player.on('playing', () => setIsLoading(false));
        player.on('error', () => setIsLoading(false));

        setCloudinaryReady(true);
      })
      .catch((error) => {
        console.error('Cloudinary player assets failed to load:', error);
        setCloudinaryReady(false);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (cloudinaryPlayerRef.current?.dispose) {
        cloudinaryPlayerRef.current.dispose();
        cloudinaryPlayerRef.current = null;
      }
    };
  }, [isCloudinary, cloudinaryCloudName, cloudinaryPublicId]);

  useEffect(() => {
    if (isCloudinary) return undefined;
    const show = () => {
      setShowControls(true);
      clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };
    const el = containerRef.current;
    if (el) {
      el.addEventListener('mousemove', show);
      el.addEventListener('touchstart', show);
    }
    return () => {
      if (el) {
        el.removeEventListener('mousemove', show);
        el.removeEventListener('touchstart', show);
      }
      clearTimeout(hideTimeout.current);
    };
  }, [isPlaying, isCloudinary]);

  const requestFS = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (e) {
      console.warn('Fullscreen blocked:', e);
    }
  };

  const togglePlay = async () => {
    if (!isPlaying) {
      await requestFS();
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  if (!videoPath) return null;

  return (
    <div className={`vpc ${isCloudinary ? 'vpc--external' : ''}`} ref={containerRef}>
      {isLoading && (
        <div className="vpc-loader">
          <div className="vpc-spinner" />
        </div>
      )}

      {isCloudinary && cloudinaryInfo ? (
        <div className="vpc-cloudinary-wrapper">
          <video ref={cloudinaryVideoRef} className="cld-video-player cld-fluid" playsInline />
        </div>
      ) : (
        <div className="vpc-player-wrapper" onClick={togglePlay}>
          <ReactPlayer
            ref={playerRef}
            url={reactPlayerUrl}
            playing={isPlaying}
            muted={isMuted}
            controls={false}
            width="100%"
            height="100%"
            playsinline
            onReady={() => setIsLoading(false)}
            onBuffer={() => setIsLoading(true)}
            onBufferEnd={() => setIsLoading(false)}
            onEnded={() => setIsPlaying(false)}
            onError={(e) => {
              console.error('Player error:', e);
              setIsLoading(false);
            }}
            config={{
              file: {
                attributes: { playsInline: true, controlsList: 'nodownload' },
              },
              youtube: { playerVars: { rel: 0, modestbranding: 1 } },
            }}
          />

          <div className={`vpc-overlay ${showControls ? 'visible' : ''}`}>
            <div className="vpc-top">
              <span className="vpc-title">{title}</span>
            </div>

            <div className="vpc-center">
              <button type="button" className="vpc-big-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }} aria-label={isPlaying ? 'Pause' : 'Lecture'}>
                {isPlaying ? <Pause className="vpc-big-btn-icon" fill="white" color="white" /> : <Play className="vpc-big-btn-icon" fill="white" color="white" />}
              </button>
            </div>

            <div className="vpc-bottom" onClick={(e) => e.stopPropagation()}>
              <div className="vpc-row">
                <div className="vpc-left">
                  <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Lecture'}>
                    {isPlaying ? <Pause size={18} color="white" /> : <Play size={18} color="white" />}
                  </button>
                  <button type="button" onClick={() => setIsMuted((m) => !m)} aria-label={isMuted ? 'Activer le son' : 'Couper le son'}>
                    {isMuted ? <VolumeX size={18} color="white" /> : <Volume2 size={18} color="white" />}
                  </button>
                </div>
                <div className="vpc-right">
                  <button type="button" onClick={() => { playerRef.current?.seekTo(0); setIsPlaying(true); }} aria-label="Recommencer depuis le début">
                    <RotateCcw size={16} color="white" />
                  </button>
                  <button type="button" onClick={requestFS} aria-label="Plein écran">
                    <Maximize size={16} color="white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCloudinary && !cloudinaryReady && !cloudinaryInfo && (
        <div className="vpc-cloudinary-fallback">URL Cloudinary invalide</div>
      )}

      <style>{`
        .vpc {
          position: relative;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          aspect-ratio: 4 / 3;
          background: #000000;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(0,0,0,0.35);
        }

        .vpc--external {
          aspect-ratio: 16 / 9;
        }

        .vpc-loader {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
        }
        .vpc-spinner {
          width: 42px;
          height: 42px;
          border: 3px solid rgba(255,255,255,0.12);
          border-top-color: #6c63ff;
          border-radius: 50%;
          animation: vpc-spin 0.9s linear infinite;
        }
        @keyframes vpc-spin { to { transform: rotate(360deg); } }

        .vpc-cloudinary-wrapper,
        .vpc-player-wrapper {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          max-width: 100%;
        }

        .vpc-player-wrapper {
          cursor: pointer;
        }

        .vpc-cloudinary-wrapper .cld-video-player {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .vpc-cloudinary-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e2e8f0;
          font-size: 14px;
        }

        .vpc-player-wrapper > div {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
        }

        .vpc-player-wrapper video {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          object-fit: contain;
        }

        .vpc-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 12px;
          background: linear-gradient(
            to top,
            rgba(0,0,0,0.65) 0%,
            transparent 45%,
            rgba(0,0,0,0.3) 100%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 10;
        }
        .vpc-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .vpc-top { display: flex; }
        .vpc-title {
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 1px 4px rgba(0,0,0,0.6);
        }

        .vpc-center {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .vpc-big-btn {
          background: rgba(255,255,255,0.18);
          border: none;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: transform 0.2s cubic-bezier(0.175,0.885,0.32,1.275), background 0.2s;
        }
        .vpc-big-btn-icon {
          width: 28px;
          height: 28px;
        }
        .vpc-big-btn:hover {
          transform: scale(1.06);
          background: rgba(255,255,255,0.28);
        }

        .vpc-bottom { display: flex; flex-direction: column; }
        .vpc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .vpc-left, .vpc-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .vpc-left button,
        .vpc-right button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          min-width: 28px;
          min-height: 28px;
          opacity: 0.9;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }
        .vpc-left button:hover,
        .vpc-right button:hover { opacity: 1; }

        @media (max-width: 768px) {
          .vpc {
            border-radius: 10px;
            aspect-ratio: 4 / 5;
          }
          .vpc--external {
            aspect-ratio: 16 / 9;
          }
          .vpc-big-btn {
            width: 44px;
            height: 44px;
          }
          .vpc-big-btn-icon {
            width: 22px;
            height: 22px;
          }
          .vpc-overlay { padding: 8px; }
          .vpc-title { font-size: 11px; }
          .vpc-left, .vpc-right { gap: 6px; }
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;
