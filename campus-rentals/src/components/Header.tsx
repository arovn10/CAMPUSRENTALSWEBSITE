"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSchoolSelect = (route: string) => {
    setPropertiesDropdownOpen(false);
    router.push(route);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/CR-social-media.png"
              alt="Campus Rentals"
              width={60}
              height={15}
              className="h-auto"
            />
          </Link>
          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-6 items-center">
            <Link href="/" className="text-text hover:text-accent transition-colors">Home</Link>
            {/* Properties Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setPropertiesDropdownOpen(!propertiesDropdownOpen)}
                className="text-text hover:text-accent transition-colors flex items-center gap-1 bg-transparent border-none outline-none focus:outline-none"
              >
                Properties
                <svg className={`w-4 h-4 transition-transform ${propertiesDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {propertiesDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => handleSchoolSelect('/tulane-housing')}
                    className="w-full text-left px-4 py-2 text-text hover:text-accent hover:bg-gray-50 transition-colors"
                  >
                    Tulane / Loyola Housing
                  </button>
                  <button
                    onClick={() => handleSchoolSelect('/fau-housing')}
                    className="w-full text-left px-4 py-2 text-text hover:text-accent hover:bg-gray-50 transition-colors"
                  >
                    FAU Housing
                  </button>
                </div>
              )}
            </div>
            <Link href="/about" className="text-text hover:text-accent transition-colors">About</Link>
            <Link href="/contact" className="text-text hover:text-accent transition-colors">Contact</Link>
            <Link href="/investors/login" className="text-text hover:text-accent transition-colors">Investors</Link>
          </nav>
          {/* Instagram Icon (always visible) */}
          <div className="flex items-center space-x-4">
            <a 
              href="https://www.instagram.com/campusrentalsllc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-secondary hover:text-accent transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            {/* Hamburger for mobile */}
            <button
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 focus:outline-none"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className={`block w-6 h-0.5 bg-text mb-1 transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-text mb-1 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-text transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={!mobileMenuOpen}
      />
      <nav
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Mobile menu"
      >
        <div className="flex flex-col p-8 space-y-6">
          <Link href="/" className="text-text text-lg hover:text-accent transition-colors" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <div className="flex flex-col space-y-2">
            <span className="text-text text-lg font-medium">Properties</span>
            <Link href="/tulane-housing" className="text-text text-base hover:text-accent transition-colors pl-4" onClick={() => setMobileMenuOpen(false)}>Tulane / Loyola Housing</Link>
            <Link href="/fau-housing" className="text-text text-base hover:text-accent transition-colors pl-4" onClick={() => setMobileMenuOpen(false)}>FAU Housing</Link>
          </div>
          <Link href="/about" className="text-text text-lg hover:text-accent transition-colors" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link href="/contact" className="text-text text-lg hover:text-accent transition-colors" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          <Link href="/investors/login" className="text-text text-lg hover:text-accent transition-colors" onClick={() => setMobileMenuOpen(false)}>Investors</Link>
          <a 
            href="https://www.instagram.com/campusrentalsllc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-secondary hover:text-accent transition-colors flex items-center gap-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
          </a>
        </div>
      </nav>
    </header>
  )
} 