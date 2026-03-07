import React, { useEffect } from 'react';
import './Splash.css';

export default function Splash() {
  useEffect(() => {
    // prevent body scroll while splash is visible
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="splash-root">
      <div className="splash-card">
        <div className="splash-logo">
          <svg width="90" height="90" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="g" cx="30%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#fff9" />
                <stop offset="60%" stopColor="#ff7a00" />
                <stop offset="100%" stopColor="#ff2a8f" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="40" fill="url(#g)" />
            <g transform="translate(50,50) scale(0.6)" fill="#fff">
              <path d="M-6 -18 L6 -18 L18 0 L6 18 L-6 18 L-18 0 Z" opacity="0.95" />
            </g>
          </svg>
        </div>

        <div className="splash-title">Supernova</div>

        <div className="splash-sub">Launching your store...</div>

        <div className="splash-loader">
          <div className="dot" style={{animationDelay:'0s'}}></div>
          <div className="dot" style={{animationDelay:'0.12s'}}></div>
          <div className="dot" style={{animationDelay:'0.24s'}}></div>
        </div>
      </div>
    </div>
  );
}
