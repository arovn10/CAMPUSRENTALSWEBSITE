'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ABODINGO_WEBSITE_URL } from '@/lib/apiConfig';

export default function Footer() {
  const pathname = usePathname();
  // Investor/admin apps have their own chrome
  if (pathname?.startsWith('/investors') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-white">
      <div className="section-shell py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className="mb-3 text-xl font-semibold tracking-tight">Campus Rentals LLC</h3>
            <p className="max-w-sm text-sm leading-relaxed text-ink-300">
              Quality off-campus student housing near Tulane University in New Orleans
              and Florida Atlantic University in Boca Raton — locally owned and managed.
            </p>
            <a
              href="https://www.instagram.com/campusrentalsllc"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm text-ink-300 transition-colors hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @campusrentalsllc
            </a>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/tulane-housing" className="text-ink-300 transition-colors hover:text-white">Tulane / Loyola Housing</Link></li>
              <li><Link href="/fau-housing" className="text-ink-300 transition-colors hover:text-white">FAU Housing</Link></li>
              <li><Link href="/about" className="text-ink-300 transition-colors hover:text-white">About Us</Link></li>
              <li><Link href="/contact" className="text-ink-300 transition-colors hover:text-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Residents &amp; Partners</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href={`${ABODINGO_WEBSITE_URL}/login`} target="_blank" rel="noopener noreferrer" className="text-ink-300 transition-colors hover:text-white">
                  Tenant Login (Abodingo)
                </a>
              </li>
              <li><Link href="/investors/login" className="text-ink-300 transition-colors hover:text-white">Investor Portal</Link></li>
              <li><a href="tel:5043834552" className="text-ink-300 transition-colors hover:text-white">(504) 383-4552</a></li>
              <li><a href="mailto:rovnerproperties@gmail.com" className="text-ink-300 transition-colors hover:text-white">rovnerproperties@gmail.com</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-xs text-ink-400 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Campus Rentals LLC. All rights reserved.</p>
          <p>New Orleans, LA &middot; Boca Raton, FL</p>
        </div>
      </div>
    </footer>
  );
}
