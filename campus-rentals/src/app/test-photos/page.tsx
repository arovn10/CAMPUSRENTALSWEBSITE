'use client';

import Image from 'next/image';

export default function TestPhotosPage() {
  const testImageUrl = 'https://abodebucket.s3.us-east-2.amazonaws.com/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg';
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Photo Rendering Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Test 1: Direct S3 URL with Next.js Image</h2>
          <div className="w-64 h-48 relative border border-gray-300">
            <Image
              src={testImageUrl}
              alt="Test S3 Image"
              fill
              className="object-cover"
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Test 2: Direct S3 URL with regular img tag</h2>
          <div className="w-64 h-48 border border-gray-300">
            <img
              src={testImageUrl}
              alt="Test S3 Image (img tag)"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Test 3: CloudFront URL with Next.js Image</h2>
          <div className="w-64 h-48 relative border border-gray-300">
            <Image
              src="https://d1m1syk7iv23tg.cloudfront.net/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg"
              alt="Test CloudFront Image"
              fill
              className="object-cover"
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
          <p>Test Image URL: {testImageUrl}</p>
          <p>CloudFront URL: https://d1m1syk7iv23tg.cloudfront.net/uploads/350A9684-5FDB-404A-8321-CC371FA823A3.jpg</p>
        </div>
      </div>
    </div>
  );
}
