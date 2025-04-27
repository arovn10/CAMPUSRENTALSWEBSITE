export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  location: string;
  school: string;
  // Do NOT use imageUrl or photos from this object
}

export interface PropertyPhoto {
  id: string;
  propertyId: string;
  url: string;
  // Add any other fields returned by the API
}

export async function fetchProperties(): Promise<Property[]> {
  const response = await fetch('https://abode-backend.onrender.com/api/property/campusrentalsnola', {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch properties');
  }
  const data = await response.json();
  console.log('Fetched properties:', data);
  return data;
}

export async function fetchPropertyPhotos(propertyId: string): Promise<PropertyPhoto[]> {
  const response = await fetch(`https://abode-backend.onrender.com/api/photos/get/${propertyId}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    console.log(`Failed to fetch photos for property ${propertyId}`);
    return [];
  }
  const data = await response.json();
  console.log(`Fetched photos for property ${propertyId}:`, data);
  return data;
} 