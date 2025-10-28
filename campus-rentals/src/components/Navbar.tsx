'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BuildingOfficeIcon,
  InformationCircleIcon,
  PhoneIcon,
  UserGroupIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="Campus Rentals" className="h-8 w-auto" />
            <span className="text-xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              Campus Rentals
            </span>
          </Link>

          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                isActive('/') ? 'text-accent' : 'text-gray-300 hover:text-accent'
              }`}
            >
              <HomeIcon className="h-5 w-5" />
              <span>Home</span>
            </Link>

            {/* Properties Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPropertiesOpen(!propertiesOpen)}
                onBlur={() => setTimeout(() => setPropertiesOpen(false), 150)}
                className={`flex items-center space-x-2 transition-colors duration-300 ${
                  pathname?.startsWith('/properties') || pathname === '/fau-housing' || pathname === '/tulane-housing' ? 'text-accent' : 'text-gray-300 hover:text-accent'
                }`}
                aria-expanded={propertiesOpen}
                aria-haspopup="true"
              >
                <BuildingOfficeIcon className="h-5 w-5" />
                <span>Properties</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${propertiesOpen ? 'rotate-180' : ''}`} />
              </button>
              {propertiesOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-900 border border-gray-800 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="py-1">
                    <Link 
                      href="/properties" 
                      onClick={() => setPropertiesOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-accent transition-colors"
                    >
                      All Properties
                    </Link>
                    <Link 
                      href="/tulane-housing" 
                      onClick={() => setPropertiesOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-accent transition-colors"
                    >
                      Housing Near Tulane
                    </Link>
                    <Link 
                      href="/fau-housing" 
                      onClick={() => setPropertiesOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-accent transition-colors"
                    >
                      Housing Near FAU
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link 
              href="/about" 
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                isActive('/about') ? 'text-accent' : 'text-gray-300 hover:text-accent'
              }`}
            >
              <InformationCircleIcon className="h-5 w-5" />
              <span>About</span>
            </Link>
            <Link 
              href="/contact" 
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                isActive('/contact') ? 'text-accent' : 'text-gray-300 hover:text-accent'
              }`}
            >
              <PhoneIcon className="h-5 w-5" />
              <span>Contact</span>
            </Link>
            <Link 
              href="/investors" 
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                isActive('/investors') ? 'text-accent' : 'text-gray-300 hover:text-accent'
              }`}
            >
              <UserGroupIcon className="h-5 w-5" />
              <span>Investors</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 