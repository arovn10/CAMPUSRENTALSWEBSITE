'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Property, PropertyAmenities } from '@/utils/api';
import { fetchProperties, getOptimizedImageUrl } from '@/utils/clientApi';
import { CachedPhoto, fetchPropertyPhotos } from '@/utils/clientApi';
import { fetchPropertyAmenities } from '@/utils/api';
import Link from 'next/link';
import {
  HomeIcon,
  BoltIcon,
  TruckIcon,
  WrenchIcon,
  CloudIcon,
  SparklesIcon,
  FireIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = Number(params.id);
  
  const [property, setProperty] = useState<Property | null>(null);
  const [photos, setPhotos] = useState<CachedPhoto[]>([]);
  const [amenities, setAmenities] = useState<PropertyAmenities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    subject: '',
  });
  const [contactStatus, setContactStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);

  useEffect(() => {
    const loadPropertyDetails = async () => {
      try {
        setLoading(true);
        const properties = await fetchProperties();
        const property = properties.find(p => p.property_id === propertyId);
        
        if (!property) {
          throw new Error('Property not found');
        }

        const [propertyPhotos, propertyAmenities] = await Promise.all([
          fetchPropertyPhotos(propertyId),
          fetchPropertyAmenities(propertyId),
        ]);

        console.log('Fetched amenities response:', propertyAmenities);
        if (!propertyAmenities) {
          console.warn('No amenities data received for property:', propertyId);
        }

        setProperty(property);
        setPhotos(propertyPhotos);
        setAmenities(propertyAmenities);
        setSelectedPhoto(propertyPhotos[0]?.photoLink || null);
        setError(null);
      } catch (err) {
        console.error('Error loading property details:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      loadPropertyDetails();
    }
  }, [propertyId]);

  useEffect(() => {
    if (photos.length > 1) {
      const interval = setInterval(() => {
        setHeroPhotoIndex((prev) => (prev + 1) % photos.length);
      }, 4000); // 4 seconds
      return () => clearInterval(interval);
    }
  }, [photos]);

  useEffect(() => {
    if (property) {
      setContactFormData((prev) => ({ ...prev, subject: `${property.name} interest` }));
    }
  }, [property]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus('submitting');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'rovnerproperties@gmail.com',
          from: contactFormData.email,
          subject: contactFormData.subject || `New Contact Form Submission from ${contactFormData.name}`,
          text: `\nName: ${contactFormData.name}\nEmail: ${contactFormData.email}\nPhone: ${contactFormData.phone}\nMessage: ${contactFormData.message}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setContactStatus('success');
      setContactFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        subject: '',
      });
    } catch (error) {
      setContactStatus('error');
    }
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactFormData(prev => ({ ...prev, [name]: value }));
  };

  function formatAvailableDate(leaseTerms: string | null): string {
    if (!leaseTerms) return 'Contact for details';
    const date = new Date(leaseTerms);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return leaseTerms;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-red-500">Error</h1>
          <p className="text-xl text-gray-300 mb-8">{error || 'Property not found'}</p>
          <Link 
            href="/properties" 
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-300"
          >
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="relative h-[60vh]">
        {photos.length > 0 && (
          <div className="absolute inset-0">
            {photos.map((photo, idx) => (
              <Image
                key={photo.photoId}
                src={getOptimizedImageUrl(photo)}
                alt={property.name}
                fill
                sizes="100vw"
                className={`object-cover transition-opacity duration-1000 ${idx === heroPhotoIndex ? 'opacity-100 z-0' : 'opacity-0 z-0'}`}
                priority={idx === 0}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-transparent z-10" />
          </div>
        )}
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-end pb-12 z-20 pointer-events-none">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent pointer-events-auto">
            {property.name}
          </h1>
          <p className="text-xl text-gray-300 pointer-events-auto">{property.address}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Property Details */}
          <div className="md:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                About This Property
              </h2>
              <p className="text-gray-300">{property.description}</p>
            </div>

            {/* Photo Gallery */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Photos
              </h2>
              {photos.length > 0 && (
                <div className="relative flex flex-col items-center">
                  <div className="relative w-full aspect-square max-w-lg rounded-lg overflow-hidden">
                    <Image
                      src={getOptimizedImageUrl(photos[selectedPhotoIndex] || photos[0])}
                      alt={`${property.name} - Photo ${photos[selectedPhotoIndex]?.photoId || photos[0].photoId}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                      priority={selectedPhotoIndex === 0}
                      loading={selectedPhotoIndex === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    <button
                      onClick={() => setSelectedPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
                      className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-accent/80 transition-colors"
                    >
                      Prev
                    </button>
                    <span className="text-gray-300">
                      {selectedPhotoIndex + 1} / {photos.length}
                    </span>
                    <button
                      onClick={() => setSelectedPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
                      className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-accent/80 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Info */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Property Details
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Price</span>
                  <span className="text-xl font-bold text-accent">${property.price}/month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Bedrooms</span>
                  <span className="text-xl font-bold">{property.bedrooms}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Bathrooms</span>
                  <span className="text-xl font-bold">{property.bathrooms}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Square Feet</span>
                  <span className="text-xl font-bold">{property.squareFeet}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Available From</span>
                  <span className="text-xl font-bold">{formatAvailableDate(property.leaseTerms)}</span>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Amenities
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {amenities && (
                  <>
                    {amenities.fullyFurnished && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <HomeIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Fully Furnished</span>
                      </div>
                    )}
                    {amenities.pool && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <SparklesIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Pool</span>
                      </div>
                    )}
                    {amenities.powderRoom && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <BoltIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Powder Room</span>
                      </div>
                    )}
                    {amenities.driveway && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <TruckIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Driveway</span>
                      </div>
                    )}
                    {amenities.laundryUnit && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <WrenchIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Laundry Unit</span>
                      </div>
                    )}
                    {amenities.centralAc && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <CloudIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Central AC</span>
                      </div>
                    )}
                    {amenities.backyard && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <SparklesIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Backyard</span>
                      </div>
                    )}
                    {amenities.fireplace && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <FireIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Fireplace</span>
                      </div>
                    )}
                    {amenities.petFriendly && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/20 rounded-lg flex items-center justify-center">
                          <HeartIcon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-gray-300">Pet Friendly</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Contact Us
              </h2>
              <div className="space-y-4">
                <a 
                  href="tel:5043834552" 
                  className="flex items-center gap-3 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  (504) 383-4552
                </a>
                <a 
                  href="mailto:rovnerproperties@gmail.com" 
                  className="flex items-center gap-3 px-4 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  rovnerproperties@gmail.com
                </a>
                {/* Contact Form */}
                <form onSubmit={handleContactSubmit} className="space-y-4 mt-6">
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={contactFormData.subject}
                      onChange={handleContactChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={contactFormData.name}
                      onChange={handleContactChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={contactFormData.email}
                      onChange={handleContactChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={contactFormData.phone}
                      onChange={handleContactChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={contactFormData.message}
                      onChange={handleContactChange}
                      required
                      rows={4}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={contactStatus === 'submitting'}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {contactStatus === 'submitting' ? 'Sending...' : 'Send Message'}
                  </button>
                  {contactStatus === 'success' && (
                    <div className="rounded-md bg-green-50 p-4">
                      <p className="text-sm text-green-700">Message sent successfully!</p>
                    </div>
                  )}
                  {contactStatus === 'error' && (
                    <div className="rounded-md bg-red-50 p-4">
                      <p className="text-sm text-red-700">Failed to send message. Please try again.</p>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 