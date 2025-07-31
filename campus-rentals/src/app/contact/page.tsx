'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { EnvelopeIcon, PhoneIcon, ClockIcon } from '@heroicons/react/24/outline';
import Script from 'next/script';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Track page view conversion when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-11303299747/A2gPCIa9pPYaEKPV6o0q'
      });
      console.log('📊 Contact page view conversion tracked');
    }
  }, []);

  // Google Ads conversion tracking for form submission
  const trackConversion = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-11303299747/A2gPCIa9pPYaEKPV6o0q'
      });
      console.log('📊 Form submission conversion tracked');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'rovnerproperties@gmail.com',
          from: formData.email,
          subject: `New Contact Form Submission from ${formData.name}`,
          text: `
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Message: ${formData.message}
          `
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
      
      // Track conversion when form is successfully submitted
      trackConversion();
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to send message. Please try again later.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Google Ads Conversion Tracking */}
      <Script id="google-ads-conversion" strategy="afterInteractive">
        {`
          // Track conversion when form is successfully submitted
          window.trackConversion = function() {
            if (typeof gtag !== 'undefined') {
              gtag('event', 'conversion', {
                'send_to': 'AW-11303299747/A2gPCIa9pPYaEKPV6o0q'
              });
            }
          };
        `}
      </Script>

      {/* Hero Section */}
      <div className="relative py-24">
        <div className="absolute inset-0">
          <Image
            src="/Campus-Rentals.png"
            alt="Campus Rentals Background"
            fill
            className="object-cover opacity-50"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 to-transparent" />
        </div>
        <div className="relative container mx-auto px-4 flex flex-col justify-center items-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-2xl text-gray-300 text-center max-w-3xl">
            Get in touch with our team for any questions or inquiries
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Phone Card */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm group hover:bg-gray-900/70 transition-all duration-300">
              <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <PhoneIcon className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Phone
              </h3>
              <a 
                href="tel:5043834552" 
                className="text-xl text-gray-300 hover:text-accent transition-colors duration-300"
              >
                (504) 383-4552
              </a>
            </div>

            {/* Email Card */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm group hover:bg-gray-900/70 transition-all duration-300">
              <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <EnvelopeIcon className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Email
              </h3>
              <a 
                href="mailto:rovnerproperties@gmail.com" 
                className="text-xl text-gray-300 hover:text-accent transition-colors duration-300"
              >
                rovnerproperties@gmail.com
              </a>
            </div>

            {/* Office Hours Card */}
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm group hover:bg-gray-900/70 transition-all duration-300">
              <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <ClockIcon className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Office Hours
              </h3>
              <p className="text-xl text-gray-300">
                Monday - Friday: 9am - 5pm
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Send us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-lg font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-lg font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-lg font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-white"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-lg font-medium text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-white"
                    required
                  />
                </div>
                {status === 'error' && (
                  <div className="text-red-400 text-sm">
                    {errorMessage}
                  </div>
                )}
                {status === 'success' && (
                  <div className="text-green-400 text-sm">
                    Message sent successfully! We'll get back to you soon.
                  </div>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full px-8 py-4 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors duration-300 text-lg font-medium"
                >
                  {status === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-400 mb-2">
              Powered by Abode Student Listing Service
            </p>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Campus Rentals. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 