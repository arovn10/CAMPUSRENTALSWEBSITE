'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PropertiesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to homepage since properties are now organized by school
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mx-auto mb-4"></div>
        <p className="text-xl text-gray-300">Redirecting...</p>
      </div>
    </div>
  );
} 