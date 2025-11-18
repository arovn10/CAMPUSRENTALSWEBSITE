-- Phase 5: Maps & GIS Tables
-- Adds tables for property location data, market data, and competitive analysis

-- ============================================
-- 1. Property Locations Table (Enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS "property_locations" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT, -- References properties table
    "dealId" TEXT, -- References deals table
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "county" TEXT,
    "country" TEXT DEFAULT 'USA',
    "timeZone" TEXT,
    "censusTract" TEXT,
    "censusBlock" TEXT,
    "geocodingAccuracy" TEXT, -- 'ROOFTOP', 'RANGE_INTERPOLATED', 'GEOMETRIC_CENTER', 'APPROXIMATE'
    "formattedAddress" TEXT,
    "placeId" TEXT, -- Google Places ID
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "property_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "property_locations_propertyId_idx" ON "property_locations"("propertyId");
CREATE INDEX IF NOT EXISTS "property_locations_dealId_idx" ON "property_locations"("dealId");
CREATE INDEX IF NOT EXISTS "property_locations_latitude_longitude_idx" ON "property_locations"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "property_locations_city_state_idx" ON "property_locations"("city", "state");

-- ============================================
-- 2. Market Data Table
-- ============================================

CREATE TABLE IF NOT EXISTS "market_data" (
    "id" TEXT NOT NULL,
    "propertyLocationId" TEXT NOT NULL, -- References property_locations
    "dataType" TEXT NOT NULL, -- 'CENSUS', 'DEMOGRAPHICS', 'ECONOMIC', 'HOUSING', 'EDUCATION'
    "dataSource" TEXT, -- 'US_CENSUS', 'BUREAU_LABOR_STATS', 'ZILLOW', 'CUSTOM'
    "dataYear" INTEGER,
    "data" JSONB NOT NULL, -- Flexible JSON structure for different data types
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "market_data_propertyLocationId_idx" ON "market_data"("propertyLocationId");
CREATE INDEX IF NOT EXISTS "market_data_dataType_idx" ON "market_data"("dataType");
CREATE INDEX IF NOT EXISTS "market_data_dataYear_idx" ON "market_data"("dataYear");

-- ============================================
-- 3. Competitive Analysis Table
-- ============================================

CREATE TABLE IF NOT EXISTS "competitive_analysis" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL, -- References deals table
    "propertyLocationId" TEXT NOT NULL, -- References property_locations (competitor property)
    "propertyName" TEXT,
    "propertyType" TEXT, -- 'STUDENT_HOUSING', 'APARTMENT', 'HOUSE', 'DORM'
    "distance" DOUBLE PRECISION, -- Distance in miles from subject property
    "bedCount" INTEGER,
    "unitCount" INTEGER,
    "rentPerBed" DOUBLE PRECISION,
    "occupancyRate" DOUBLE PRECISION,
    "amenities" TEXT[], -- Array of amenities
    "notes" TEXT,
    "dataSource" TEXT, -- Where this data came from
    "lastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "competitive_analysis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "competitive_analysis_dealId_idx" ON "competitive_analysis"("dealId");
CREATE INDEX IF NOT EXISTS "competitive_analysis_propertyLocationId_idx" ON "competitive_analysis"("propertyLocationId");
CREATE INDEX IF NOT EXISTS "competitive_analysis_propertyType_idx" ON "competitive_analysis"("propertyType");

-- ============================================
-- 4. Map Layers Table (Custom map layers)
-- ============================================

CREATE TABLE IF NOT EXISTS "map_layers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layerType" TEXT NOT NULL, -- 'GEOJSON', 'KML', 'MARKER_CLUSTER', 'HEATMAP', 'POLYGON'
    "data" JSONB, -- Layer data (GeoJSON, coordinates, etc.)
    "style" JSONB, -- Styling configuration
    "isVisible" BOOLEAN DEFAULT true,
    "isPublic" BOOLEAN DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "map_layers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "map_layers_layerType_idx" ON "map_layers"("layerType");
CREATE INDEX IF NOT EXISTS "map_layers_createdBy_idx" ON "map_layers"("createdBy");
CREATE INDEX IF NOT EXISTS "map_layers_isPublic_idx" ON "map_layers"("isPublic");

-- ============================================
-- 5. University Proximity Analysis Table
-- ============================================

CREATE TABLE IF NOT EXISTS "university_proximity" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL, -- References deals table
    "universityId" TEXT NOT NULL, -- References universities table
    "distance" DOUBLE PRECISION NOT NULL, -- Distance in miles
    "walkingTime" INTEGER, -- Walking time in minutes
    "drivingTime" INTEGER, -- Driving time in minutes
    "publicTransitTime" INTEGER, -- Public transit time in minutes
    "walkabilityScore" INTEGER, -- 0-100
    "transitScore" INTEGER, -- 0-100
    "bikeScore" INTEGER, -- 0-100
    "routeData" JSONB, -- Detailed route information
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "university_proximity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "university_proximity_dealId_idx" ON "university_proximity"("dealId");
CREATE INDEX IF NOT EXISTS "university_proximity_universityId_idx" ON "university_proximity"("universityId");
CREATE INDEX IF NOT EXISTS "university_proximity_distance_idx" ON "university_proximity"("distance");

