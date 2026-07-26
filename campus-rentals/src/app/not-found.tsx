import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center bg-ink-50">
      <div className="section-shell">
        <div className="mx-auto max-w-xl text-center">
          <span className="eyebrow">404</span>
          <h1 className="text-display font-semibold text-ink-900">We can&apos;t find that page.</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-600">
            The link may be old, or a home may have been leased and taken down. Everything currently
            available is one click away.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href="/properties" className="btn-hero">
              Browse available homes
            </Link>
            <Link href="/contact" className="btn-quiet">
              Contact us
            </Link>
          </div>
          <p className="mt-8 text-sm text-ink-500">
            Looking for something specific? Call{' '}
            <a href="tel:5043834552" className="font-medium text-accent-deep hover:underline">
              (504) 383-4552
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
