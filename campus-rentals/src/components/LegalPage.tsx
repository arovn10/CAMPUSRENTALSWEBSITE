import React from 'react';

/**
 * Shared shell for the policy pages (/privacy, /terms, /fair-housing).
 * Plain, readable, on-brand — these exist to be trusted and skimmed, not admired.
 */
export default function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-50">
      <section className="border-b border-ink-100 bg-white">
        <div className="section-shell py-16 sm:py-20">
          <span className="eyebrow">Campus Rentals LLC</span>
          <h1 className="text-display font-semibold text-ink-900">{title}</h1>
          {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">{intro}</p>}
          <p className="mt-6 text-sm text-ink-500">Last updated {updated}</p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="section-shell">
          <div className="max-w-2xl space-y-10 text-[15px] leading-relaxed text-ink-700 [&_a]:font-medium [&_a]:text-accent-deep [&_a:hover]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-1.5">
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
