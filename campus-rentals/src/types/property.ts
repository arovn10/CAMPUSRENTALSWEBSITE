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
  photos?: string[]; // Array of all photo URLs for the property
  school: string | null;
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

export interface PropertyPhoto {
  propertyKey: number;
  photoLink: string;
  description: string;
  photoOrder: number | null;
  photoId: number;
}

export interface PropertyAmenities {
  fullyFurnished: boolean;
  pool: boolean;
  powderRoom: boolean;
  driveway: boolean;
  laundryUnit: boolean;
  centralAc: boolean;
  backyard: boolean;
  fireplace: boolean;
  petFriendly: boolean;
  propertyId: number;
} 