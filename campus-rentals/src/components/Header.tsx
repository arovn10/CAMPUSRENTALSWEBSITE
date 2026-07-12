"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ABODINGO_WEBSITE_URL } from '@/lib/apiConfig';

const TENANT_LOGIN_URL = `${ABODINGO_WEBSITE_URL}/login`;

const navLink =
  'relative text-[15px] font-medium text-ink-600 transition-colors duration-200 hover:text-ink-900 after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-accent after:transition-all after:duration-300 hover:after:w-full';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [propertiesDropdownOpen, setPropertiesDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPropertiesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't show main site header inside investor or admin app — they have their own nav.
  // (Hooks above must run unconditionally.)
  if (pathname?.startsWith('/investors') || pathname?.startsWith('/admin')) {
    return null;
  }

  const handleSchoolSelect = (route: string) => {
    setPropertiesDropdownOpen(false);
    router.push(route);
  };

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="section-shell">
        <div className="flex items-center justify-between py-3.5">
          <Link href="/" className="flex items-center transition-opacity duration-200 hover:opacity-80">
            <Image
              src="/CR-social-media.png"
              alt="Campus Rentals"
              width={64}
              height={16}
              className="h-auto"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/" className={navLink}>Home</Link>
            {/* Properties Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setPropertiesDropdownOpen(!propertiesDropdownOpen)}
                className={`${navLink} flex items-center gap-1 border-none bg-transparent outline-none focus:outline-none`}
              >
                Properties
                <svg className={`h-3.5 w-3.5 transition-transform duration-300 ${propertiesDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {propertiesDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-3 w-60 overflow-hidden rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-ink-900/5 animate-scale-in">
                  <button
                    onClick={() => handleSchoolSelect('/tulane-housing')}
                    className="w-full rounded-xl bg-transparent px-4 py-3 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
                  >
                    Tulane / Loyola
                    <span className="block text-xs font-normal text-ink-400">New Orleans, LA</span>
                  </button>
                  <button
                    onClick={() => handleSchoolSelect('/fau-housing')}
                    className="w-full rounded-xl bg-transparent px-4 py-3 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
                  >
                    FAU
                    <span className="block text-xs font-normal text-ink-400">Boca Raton, FL</span>
                  </button>
                </div>
              )}
            </div>
            <Link href="/about" className={navLink}>About</Link>
            <Link href="/contact" className={navLink}>Contact</Link>
            <Link href="/investors/login" className={navLink}>Investors</Link>
            <a
              href={TENANT_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-lift"
            >
              Tenant Login
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </nav>

          {/* Instagram + hamburger (mobile) */}
          <div className="flex items-center gap-4 md:hidden">
            <a
              href="https://www.instagram.com/campusrentalsllc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-500 transition-colors hover:text-accent"
              aria-label="Instagram"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <button
              className="flex h-10 w-10 flex-col items-center justify-center bg-transparent focus:outline-none"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className={`mb-1 block h-0.5 w-6 bg-ink-800 transition-all duration-300 ${mobileMenuOpen ? 'translate-y-1.5 rotate-45' : ''}`}></span>
              <span className={`mb-1 block h-0.5 w-6 bg-ink-800 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block h-0.5 w-6 bg-ink-800 transition-all duration-300 ${mobileMenuOpen ? '-translate-y-1.5 -rotate-45' : ''}`}></span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={!mobileMenuOpen}
      />
      <nav
        className={`fixed right-0 top-0 z-50 h-full w-72 transform bg-white shadow-lift transition-transform duration-300 ease-out-expo ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Mobile menu"
      >
        <div className="flex flex-col space-y-5 p-8 pt-10">
          <Link href="/" className="text-lg font-medium text-ink-800 transition-colors hover:text-accent" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <div className="flex flex-col space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">Properties</span>
            <Link href="/tulane-housing" className="pl-1 text-base text-ink-700 transition-colors hover:text-accent" onClick={() => setMobileMenuOpen(false)}>Tulane / Loyola — New Orleans</Link>
            <Link href="/fau-housing" className="pl-1 text-base text-ink-700 transition-colors hover:text-accent" onClick={() => setMobileMenuOpen(false)}>FAU — Boca Raton</Link>
          </div>
          <Link href="/about" className="text-lg font-medium text-ink-800 transition-colors hover:text-accent" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link href="/contact" className="text-lg font-medium text-ink-800 transition-colors hover:text-accent" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          <Link href="/investors/login" className="text-lg font-medium text-ink-800 transition-colors hover:text-accent" onClick={() => setMobileMenuOpen(false)}>Investors</Link>
          <a
            href={TENANT_LOGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Tenant Login
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </nav>
    </header>
  )
}
