'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function TestVideoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const videoUrl = "https://abodebucket.s3.us-east-2.amazonaws.com/uploads/ArchitecturalAnimation.MP4";

    video.src = videoUrl;
    video.load();

    video.play().catch(error => {
      console.error('Video playback failed:', error);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="w-full bg-white shadow-sm py-4 px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/CR-logo.svg" alt="Campus Rentals Logo" className="h-10 w-auto" />
        </Link>
        <nav className="flex gap-8 items-center">
          <Link href="/" className="text-gray-800 hover:text-accent font-medium">Home</Link>
          <Link href="/properties" className="text-gray-800 hover:text-accent font-medium">Properties</Link>
          <Link href="/about" className="text-gray-800 hover:text-accent font-medium">About</Link>
          <Link href="/contact" className="text-gray-800 hover:text-accent font-medium">Contact</Link>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-accent">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
          </a>
        </nav>
      </header>
      {/* Video Section */}
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-4xl">
          <video
            ref={videoRef}
            controls
            className="w-full rounded-xl"
          >
            <source src="https://abodebucket.s3.us-east-2.amazonaws.com/uploads/ArchitecturalAnimation.MP4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
} 