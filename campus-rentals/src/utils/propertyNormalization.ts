import { Property } from '@/types';

const toNumber = (value: unknown, fallback: number | null = null): number | null => {
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toString = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  return String(value);
};

const normalizeSchool = (value: unknown): string | null => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (raw.toLowerCase() === 'fau') return 'Florida Atlantic University';
  return raw;
};

const inferSchoolFromAddress = (address?: string | null): string | null => {
  if (!address) return null;
  const lower = address.toLowerCase();
  if (lower.includes('boca raton') || lower.includes('fau') || lower.includes('fl')) {
    return 'Florida Atlantic University';
  }
  if (lower.includes('new orleans') || lower.includes(', la')) {
    return 'Tulane University';
  }
  return null;
};

const buildRange = (values: Array<number | null | undefined>) => {
  const filtered = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (filtered.length === 0) return { min: null, max: null };
  return { min: Math.min(...filtered), max: Math.max(...filtered) };
};

const normalizeProperty = (raw: any): Property => {
  const address = toString(raw?.address ?? raw?.Address ?? raw?.buildingAddress ?? '');
  const name = toString(raw?.name ?? raw?.Name ?? raw?.propertyName ?? raw?.buildingName ?? '');
  const buildingId = toNumber(raw?.buildingId ?? raw?.BuildingId);
  const propertyId = toNumber(raw?.property_id ?? raw?.propertyId ?? raw?.PropertyId ?? raw?.id, 0) || 0;
  const school = normalizeSchool(raw?.school ?? raw?.School);

  return {
    property_id: propertyId,
    username: toString(raw?.username ?? raw?.Username ?? ''),
    address,
    name: name || address,
    description: toString(raw?.description ?? raw?.Description ?? ''),
    bedrooms: toNumber(raw?.bedrooms ?? raw?.Bedrooms, 0) || 0,
    bathrooms: toNumber(raw?.bathrooms ?? raw?.Bathrooms, 0) || 0,
    price: toNumber(raw?.price ?? raw?.Price, 0) || 0,
    squareFeet: toNumber(raw?.squareFeet ?? raw?.SquareFeet, 0) || 0,
    amenities: raw?.amenities ?? raw?.Amenities ?? null,
    leaseTerms: toString(raw?.leaseTerms ?? raw?.LeaseTerms ?? ''),
    photo: raw?.photo ?? raw?.Photo ?? null,
    school,
    latitude: toNumber(raw?.latitude ?? raw?.Latitude, null),
    longitude: toNumber(raw?.longitude ?? raw?.Longitude, null),
    buildingId,
    buildingName: raw?.buildingName ?? raw?.BuildingName ?? null,
    buildingAddress: raw?.buildingAddress ?? raw?.BuildingAddress ?? null,
    isBuilding: raw?.isBuilding ?? raw?.IsBuilding ?? null,
    propertyTypeCategory: raw?.propertyTypeCategory ?? raw?.PropertyTypeCategory ?? null,
  };
};

export const normalizeProperties = (input: any[]): Property[] => {
  const normalized = Array.isArray(input) ? input.map(normalizeProperty) : [];
  const buildingGroups = new Map<number, Property[]>();
  const existingIds = new Set<number>();

  normalized.forEach((property) => {
    existingIds.add(property.property_id);
    if (!property.school) {
      property.school = inferSchoolFromAddress(property.address);
    }
    if (property.buildingId) {
      const group = buildingGroups.get(property.buildingId) ?? [];
      group.push(property);
      buildingGroups.set(property.buildingId, group);
    }
  });

  const derivedBuildings: Property[] = [];

  buildingGroups.forEach((units, buildingId) => {
    const hasBuildingRecord = existingIds.has(buildingId);
    const school =
      normalizeSchool(units.find((unit) => unit.school)?.school) ??
      inferSchoolFromAddress(units.find((unit) => unit.buildingAddress || unit.address)?.buildingAddress || units[0]?.address);

    units.forEach((unit) => {
      if (!unit.school && school) {
        unit.school = school;
      }
      if (!unit.buildingName && units[0]?.buildingName) {
        unit.buildingName = units[0]?.buildingName;
      }
      if (!unit.buildingAddress && units[0]?.buildingAddress) {
        unit.buildingAddress = units[0]?.buildingAddress;
      }
    });

    if (hasBuildingRecord) {
      const buildingRecord = normalized.find((property) => property.property_id === buildingId);
      if (buildingRecord && !buildingRecord.school && school) {
        buildingRecord.school = school;
      }
      return;
    }

    const rentRange = buildRange(units.map((unit) => unit.price));
    const bedRange = buildRange(units.map((unit) => unit.bedrooms));
    const bathRange = buildRange(units.map((unit) => unit.bathrooms));
    const sqftRange = buildRange(units.map((unit) => unit.squareFeet));

    const representative = units[0];
    const buildingName = representative.buildingName || representative.name || `Building ${buildingId}`;
    const buildingAddress = representative.buildingAddress || representative.address;

    derivedBuildings.push({
      property_id: buildingId,
      username: representative.username,
      address: buildingAddress,
      name: buildingName,
      description: representative.description,
      bedrooms: bedRange.max ?? 0,
      bathrooms: bathRange.max ?? 0,
      price: rentRange.min ?? 0,
      squareFeet: sqftRange.max ?? 0,
      amenities: representative.amenities ?? null,
      leaseTerms: representative.leaseTerms,
      photo: representative.photo ?? null,
      school: school ?? representative.school ?? null,
      latitude: representative.latitude ?? null,
      longitude: representative.longitude ?? null,
      buildingId,
      buildingName,
      buildingAddress,
      isBuilding: true,
      isBuildingGroup: true,
      unitCount: units.length,
      unitIds: units.map((unit) => unit.property_id),
      minRent: rentRange.min,
      maxRent: rentRange.max,
      minBeds: bedRange.min,
      maxBeds: bedRange.max,
      minBaths: bathRange.min,
      maxBaths: bathRange.max,
    });
  });

  return [...normalized, ...derivedBuildings];
};
