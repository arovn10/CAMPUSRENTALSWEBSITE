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