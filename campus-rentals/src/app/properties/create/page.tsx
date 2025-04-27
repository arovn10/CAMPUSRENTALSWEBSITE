import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Property } from '@/types';

export default function CreatePropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>({});
  const [photos, setPhotos] = useState<any[]>([]);

  useEffect(() => {
    const data = localStorage.getItem('copyPropertyData');
    if (data) {
      const { property, photos } = JSON.parse(data);
      setForm(property);
      setPhotos(photos || []);
      localStorage.removeItem('copyPropertyData');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement property creation logic (API call)
    alert('Property created! (implement API call)');
    router.push('/properties');
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Create Property</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <input name="name" value={form.name || ''} onChange={handleChange} placeholder="Name" className="w-full p-2 border rounded" />
        <input name="address" value={form.address || ''} onChange={handleChange} placeholder="Address" className="w-full p-2 border rounded" />
        <textarea name="description" value={form.description || ''} onChange={handleChange} placeholder="Description" className="w-full p-2 border rounded" />
        <input name="bedrooms" type="number" value={form.bedrooms || ''} onChange={handleChange} placeholder="Bedrooms" className="w-full p-2 border rounded" />
        <input name="bathrooms" type="number" value={form.bathrooms || ''} onChange={handleChange} placeholder="Bathrooms" className="w-full p-2 border rounded" />
        <input name="price" type="number" value={form.price || ''} onChange={handleChange} placeholder="Price" className="w-full p-2 border rounded" />
        <input name="squareFeet" type="number" value={form.squareFeet || ''} onChange={handleChange} placeholder="Square Feet" className="w-full p-2 border rounded" />
        <input name="leaseTerms" value={form.leaseTerms || ''} onChange={handleChange} placeholder="Lease Terms" className="w-full p-2 border rounded" />
        <input name="school" value={form.school || ''} onChange={handleChange} placeholder="School" className="w-full p-2 border rounded" />
        {/* Show copied photos if available */}
        {photos.length > 0 && (
          <div className="mb-4">
            <h2 className="font-semibold mb-2">Copied Photos</h2>
            <div className="flex gap-2 flex-wrap">
              {photos.map((photo, idx) => (
                <img key={idx} src={photo.photoLink} alt="Copied" className="w-24 h-24 object-cover rounded" />
              ))}
            </div>
          </div>
        )}
        {/* TODO: Add photo upload input */}
        <button type="submit" className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-300 font-medium">Create Property</button>
      </form>
    </div>
  );
} 