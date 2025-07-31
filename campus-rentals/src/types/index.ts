export interface Property {
  property_id: number;
  username: string;
  address: string;
  name: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  squareFeet: number;
  amenities: string | null;
  leaseTerms: string;
  photo: string | null;
  school: string;
  photoUrl?: string | null;
  latitude: number;
  longitude: number;
}

// Google Analytics gtag function declaration
declare global {
  interface Window {
    gtag: (
      command: 'js' | 'config' | 'event',
      targetId: string | Date,
      config?: {
        [key: string]: any;
      }
    ) => void;
    dataLayer: any[];
  }
} 