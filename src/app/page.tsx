'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const videoUrl = "https://abodebucket.s3.us-east-2.amazonaws.com/uploads/ArchitecturalAnimation.MP4";
      
      console.log('Attempting to load video from:', videoUrl);
      
      // Set up event listeners
      video.onerror = (e) => {
        console.error('Video failed to load:', e);
        console.error('Video error details:', video.error);
        setVideoError(true);
        setIsLoading(false);
      };
      
      video.onloadeddata = () => {
        console.log('Video loaded successfully');
        setIsLoading(false);
      };
      
      video.onloadstart = () => {
        console.log('Video loading started');
      };
      
      video.onstalled = () => {
        console.error('Video stalled while loading');
      };
      
      // Set source and attempt to play
      video.src = videoUrl;
      video.load();
      
      video.play().catch(error => {
        console.error('Video playback failed:', error);
        setVideoError(true);
        setIsLoading(false);
      });
    }
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-screen">
        <div className="absolute inset-0">
          {isLoading && (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-white">Loading video...</div>
            </div>
          )}
          {!videoError && !isLoading && (
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
            />
          )}
          {videoError && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="text-white text-center">
                <p className="text-xl mb-2">Video failed to load</p>
                <p className="text-sm">Please check the browser console for error details</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-transparent" style={{ zIndex: 1 }} />
        </div>
      </div>
    </main>
  );
} 