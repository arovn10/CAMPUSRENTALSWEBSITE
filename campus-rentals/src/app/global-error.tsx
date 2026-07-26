'use client';

/**
 * Last-resort boundary: catches errors thrown in the root layout itself, where
 * the normal error.tsx cannot render. Must supply its own <html>/<body>, and
 * cannot rely on globals.css being applied — so styles are inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F8F8',
          color: '#1f2933',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#54AAB1',
            }}
          >
            Campus Rentals
          </p>
          <h1 style={{ margin: '0.75rem 0 0', fontSize: '2rem', letterSpacing: '-0.02em' }}>
            The site had a problem loading.
          </h1>
          <p style={{ margin: '1rem 0 0', lineHeight: 1.6, color: '#52606D' }}>
            Please reload the page. If it keeps happening, call us at (504) 383-4552 and we&apos;ll help
            you directly.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '1.75rem',
              border: 0,
              borderRadius: '9999px',
              background: '#54AAB1',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
