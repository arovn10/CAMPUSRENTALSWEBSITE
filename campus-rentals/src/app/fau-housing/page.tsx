'use client';

import React from 'react';
import Link from 'next/link';
import { 
  MapPinIcon, 
  ClockIcon, 
  WifiIcon, 
  TruckIcon, 
  ShieldCheckIcon,
  AcademicCapIcon,
  HomeIcon,
  StarIcon
} from '@heroicons/react/24/outline';

export default function FAUHousingPage() {
  const features = [
    {
      icon: <MapPinIcon className="w-8 h-8" />,
      title: "Prime Location Near FAU",
      description: "Walking distance to Florida Atlantic University's main campus"
    },
    {
      icon: <WifiIcon className="w-8 h-8" />,
      title: "High-Speed Internet",
      description: "Included high-speed WiFi for all your academic needs"
    },
    {
      icon: <TruckIcon className="w-8 h-8" />,
      title: "Free Parking",
      description: "Dedicated parking spaces for residents"
    },
    {
      icon: <ShieldCheckIcon className="w-8 h-8" />,
      title: "24/7 Security",
      description: "Secure building with key card access and security cameras"
    },
    {
      icon: <AcademicCapIcon className="w-8 h-8" />,
      title: "Study Spaces",
      description: "Quiet study rooms and common areas for group projects"
    },
    {
      icon: <HomeIcon className="w-8 h-8" />,
      title: "Furnished Units",
      description: "Fully furnished apartments ready for immediate move-in"
    }
  ];

  const properties = [
    {
      name: "FAU Student Village",
      price: "$1,200/month",
      bedrooms: "2-4 Bedrooms",
      distance: "0.3 miles from FAU",
      image: "/placeholder.png",
      features: ["Pool", "Gym", "Study Rooms", "Parking"]
    },
    {
      name: "Campus View Apartments",
      price: "$1,100/month", 
      bedrooms: "1-3 Bedrooms",
      distance: "0.5 miles from FAU",
      image: "/placeholder.png",
      features: ["Balcony", "Laundry", "Pet Friendly", "High-Speed WiFi"]
    },
    {
      name: "University Heights",
      price: "$1,300/month",
      bedrooms: "2-4 Bedrooms", 
      distance: "0.2 miles from FAU",
      image: "/placeholder.png",
      features: ["Pool", "Tennis Court", "Study Lounge", "24/7 Security"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-green-900/80 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-40" />
        
        <div className="relative z-20 flex flex-col justify-center items-center py-20 px-4 text-center max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <AcademicCapIcon className="w-12 h-12 text-yellow-400 mr-4" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
              Housing Near FAU
            </h1>
          </div>
          <p className="text-2xl text-gray-200 mb-8 max-w-3xl">
            Premium student housing options near Florida Atlantic University
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="#properties" 
              className="px-8 py-4 bg-yellow-500 text-black rounded-xl hover:bg-yellow-400 transition-colors duration-300 text-lg font-medium"
            >
              View Properties Near FAU
            </Link>
            <Link 
              href="/contact" 
              className="px-8 py-4 bg-green-500 text-white rounded-xl hover:bg-green-400 transition-colors duration-300 text-lg font-medium"
            >
              Schedule Tour
            </Link>
          </div>
        </div>
      </div>

      {/* Why Choose Section */}
      <section className="py-20 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
            Why Choose Housing Near FAU?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm hover:bg-gray-900/70 transition-colors duration-300">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4 text-yellow-400">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-yellow-400">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section id="properties" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
            Properties Near FAU
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {properties.map((property, index) => (
              <div key={index} className="bg-gray-900/50 rounded-xl overflow-hidden backdrop-blur-sm hover:bg-gray-900/70 transition-colors duration-300">
                <div className="h-48 bg-gray-700 flex items-center justify-center">
                  <img 
                    src={property.image} 
                    alt={property.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.png';
                    }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-yellow-400">{property.name}</h3>
                  <div className="flex items-center mb-2">
                    <MapPinIcon className="w-4 h-4 text-green-400 mr-2" />
                    <span className="text-sm text-gray-300">{property.distance}</span>
                  </div>
                  <div className="flex items-center mb-4">
                    <HomeIcon className="w-4 h-4 text-blue-400 mr-2" />
                    <span className="text-sm text-gray-300">{property.bedrooms}</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400 mb-4">{property.price}</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {property.features.map((feature, featureIndex) => (
                      <span key={featureIndex} className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                  <Link 
                    href="/contact" 
                    className="w-full bg-yellow-500 text-black py-2 px-4 rounded-lg hover:bg-yellow-400 transition-colors duration-300 text-center block font-medium"
                  >
                    Schedule Tour
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Area Benefits */}
      <section className="py-20 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
            FAU Area Benefits
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-yellow-400">Ideal for FAU Students</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <StarIcon className="w-6 h-6 text-yellow-400 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">Walking distance to FAU's main campus and library</span>
                </li>
                <li className="flex items-start">
                  <StarIcon className="w-6 h-6 text-yellow-400 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">Easy access to recreation centers and dining</span>
                </li>
                <li className="flex items-start">
                  <StarIcon className="w-6 h-6 text-yellow-400 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">Close to research facilities and labs</span>
                </li>
                <li className="flex items-start">
                  <StarIcon className="w-6 h-6 text-yellow-400 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">Convenient access to shuttle services</span>
                </li>
                <li className="flex items-start">
                  <StarIcon className="w-6 h-6 text-yellow-400 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">Near sports facilities and events</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-900/50 p-8 rounded-xl backdrop-blur-sm">
              <h4 className="text-xl font-bold mb-4 text-green-400">Student Discounts</h4>
              <p className="text-gray-300 mb-4">
                Special rates and incentives available for students, including:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li>• Reduced security deposits</li>
                <li>• Flexible lease terms aligned with academic calendar</li>
                <li>• Free move-in assistance</li>
                <li>• Access to local student events and activities</li>
                <li>• Priority placement for returning students</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
            Ready to Find Housing Near FAU?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join hundreds of students who have found their perfect off-campus housing with us.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/contact" 
              className="px-8 py-4 bg-yellow-500 text-black rounded-xl hover:bg-yellow-400 transition-colors duration-300 text-lg font-medium"
            >
              Schedule a Tour
            </Link>
            <Link 
              href="/properties" 
              className="px-8 py-4 bg-green-500 text-white rounded-xl hover:bg-green-400 transition-colors duration-300 text-lg font-medium"
            >
              View All Properties
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-400 mb-2">
              Premium Housing Near FAU
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