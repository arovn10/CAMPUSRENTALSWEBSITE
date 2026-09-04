'use client';

import { useState, useEffect } from 'react';
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
    }
  }, []);

  // Google Ads conversion tracking for form submission
  const trackConversion = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-11303299747/A2gPCIa9pPYaEKPV6o0q'
      });
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
          to: 'arovner@campusrentalsllc.com',
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

  const inputCls =
    'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-base text-ink-800 placeholder:text-ink-500 outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20';

  return (
    <div className="min-h-screen bg-ink-50">
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

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-ink-950 py-24 sm:py-32">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #54AAB1, transparent)' }}
        />
        <div className="section-shell relative text-center stagger">
          <span className="eyebrow-on-dark">Contact us</span>
          <h1 className="text-display-xl font-semibold text-white">Let&apos;s find your home.</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/70 sm:text-xl">
            Questions about a property, a tour, or leasing near Tulane or FAU? We reply fast.
          </p>
        </div>
      </section>

      {/* ============ CONTACT INFO ============ */}
      <section className="py-20 sm:py-24">
        <div className="section-shell">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="card-premium p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                <PhoneIcon className="h-6 w-6 text-accent-deep" />
              </div>
              <h2 className="mb-2 text-lg font-semibold tracking-tight text-ink-900">Phone</h2>
              <a href="tel:5043834552" className="text-ink-600 transition-colors hover:text-accent-deep">
                (504) 383-4552
              </a>
            </div>

            <div className="card-premium p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                <EnvelopeIcon className="h-6 w-6 text-accent-deep" />
              </div>
              <h2 className="mb-2 text-lg font-semibold tracking-tight text-ink-900">Email</h2>
              <a
                href="mailto:arovner@campusrentalsllc.com"
                className="text-ink-600 transition-colors hover:text-accent-deep"
              >
                arovner@campusrentalsllc.com
              </a>
            </div>

            <div className="card-premium p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                <ClockIcon className="h-6 w-6 text-accent-deep" />
              </div>
              <h2 className="mb-2 text-lg font-semibold tracking-tight text-ink-900">Office hours</h2>
              <p className="text-ink-600">Monday – Friday: 9am – 5pm</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FORM ============ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="section-shell">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <span className="eyebrow">Send a message</span>
              <h2 className="text-display font-semibold text-ink-900">We&apos;ll get back to you soon.</h2>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 space-y-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-ink-700">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-ink-700">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className={inputCls}
                  required
                />
              </div>

              {status === 'error' && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
              )}
              {status === 'success' && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Message sent successfully! We&apos;ll get back to you soon.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-xl bg-accent-deep px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:bg-[#336E73] disabled:translate-y-0 disabled:opacity-60"
              >
                {status === 'loading' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
