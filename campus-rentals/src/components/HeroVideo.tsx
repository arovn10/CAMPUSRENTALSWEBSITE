'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hero background video, loaded defensively.
 *
 * The source asset is ~68 MB. Autoplaying it unconditionally meant every
 * first-time visitor — including students on cellular — downloaded 68 MB and
 * stared at a black hero until enough buffered (2026-07-23 audit).
 *
 * So we only ever start it when it is actually a good idea:
 *   - viewport is desktop-sized (no video on phones at all)
 *   - the user has not asked for reduced motion
 *   - the browser is not reporting a slow connection or Data Saver
 * Otherwise the poster/gradient alone carries the hero, which is the same
 * thing a phone user saw anyway while the video buffered.
 *
 * It is served through CloudFront rather than S3 direct (HTTP/2 + edge cache),
 * with `preload="metadata"` so we never speculatively pull the whole file, and
 * a pause control so long-running motion is dismissible (WCAG 2.2.2).
 *
 * TODO(asset): the source is still a 68 MB MP4 with Content-Type
 * binary/octet-stream. Transcoding it to <3 MB (and adding a poster frame +
 * correct content-type) needs S3 write access, so it is tracked separately.
 */

const VIDEO_URL =
  'https://d1m1syk7iv23tg.cloudfront.net/uploads/ArchitecturalAnimation.MP4';

export default function HeroVideo() {
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const bigEnough = window.matchMedia('(min-width: 1024px)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Network Information API — not in every browser, so treat absence as "fine".
    const conn = (navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }).connection;
    const slowLink =
      !!conn && (conn.saveData === true || ['slow-2g', '2g', '3g'].includes(conn.effectiveType || ''));

    setEnabled(bigEnough && !reduceMotion && !slowLink);
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      {/* Always-present base so the hero is never a raw black void. */}
      <div className="absolute inset-0 bg-ink-950" aria-hidden="true" />

      {enabled && (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover opacity-50"
            src={VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause background video' : 'Play background video'}
            className="absolute bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-ink-950/55 text-white/80 backdrop-blur-md transition-colors hover:bg-ink-950/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {playing ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5l11 7-11 7z" />
              </svg>
            )}
          </button>
        </>
      )}
    </>
  );
}
