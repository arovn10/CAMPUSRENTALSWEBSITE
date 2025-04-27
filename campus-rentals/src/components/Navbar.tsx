'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BuildingOfficeIcon,
  InformationCircleIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

export default function Navbar() {
  const pathname = usePathname();

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
            <Link 
              href="/properties" 
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                isActive('/properties') ? 'text-accent' : 'text-gray-300 hover:text-accent'
              }`}
            >
              <BuildingOfficeIcon className="h-5 w-5" />
              <span>Properties</span>
            </Link>
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
          </div>
        </div>
      </div>
    </nav>
  );
} 