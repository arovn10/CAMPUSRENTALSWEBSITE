'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface it in the browser console and in any log drain watching stderr.
    console.error('Unhandled page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center bg-ink-50">
      <div className="section-shell">
        <div className="mx-auto max-w-xl text-center">
          <span className="eyebrow">Something went wrong</span>
          <h1 className="text-display font-semibold text-ink-900">This page hit a snag.</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-600">
            That&apos;s on us, not you. Try again — and if it keeps happening, call and we&apos;ll help
            directly.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <button onClick={reset} className="btn-hero">
              Try again
            </button>
            <Link href="/" className="btn-quiet">
              Go home
            </Link>
          </div>
          <p className="mt-8 text-sm text-ink-500">
            <a href="tel:5043834552" className="font-medium text-accent-deep hover:underline">
              (504) 383-4552
            </a>
            {error.digest && <span className="ml-2 text-ink-500">Reference: {error.digest}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
