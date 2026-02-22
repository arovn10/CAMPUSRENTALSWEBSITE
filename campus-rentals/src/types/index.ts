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
  school: string | null;
  photoUrl?: string | null;
  latitude: number | null;
  longitude: number | null;
  buildingId?: number | null;
  buildingName?: string | null;
  buildingAddress?: string | null;
  isBuilding?: boolean | null;
  propertyTypeCategory?: string | null;
  isBuildingGroup?: boolean;
  unitCount?: number;
  unitIds?: number[];
  minRent?: number | null;
  maxRent?: number | null;
  minBeds?: number | null;
  maxBeds?: number | null;
  minBaths?: number | null;
  maxBaths?: number | null;
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