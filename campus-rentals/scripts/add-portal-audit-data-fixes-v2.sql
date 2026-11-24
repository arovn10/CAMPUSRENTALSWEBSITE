-- Data repairs from portal audit: valuations, CR LLC owners, Zimpel naming, EIN public flag.

-- 1) Sync stabilized valuations to known ~7.25% cap workbook figures
UPDATE properties SET "currentValue" = 1195867.90, "updatedAt" = NOW()
WHERE LOWER(address) LIKE '%1414%audubon%';

UPDATE properties SET "currentValue" = 826466.52, "updatedAt" = NOW()
WHERE LOWER(address) LIKE '%2422%joseph%';

UPDATE properties SET "currentValue" = 1593387.90, "updatedAt" = NOW()
WHERE LOWER(address) LIKE '%7500%zimple%' OR LOWER(address) LIKE '%7500%zimpel%';

UPDATE properties SET
  "currentValue" = 1658403.90,
  name = '7504-7506 Zimpel St',
  address = '7504-7506 Zimpel St, New Orleans, LA 70118',
  "updatedAt" = NOW()
WHERE LOWER(address) LIKE '%7506%zim%' OR LOWER(address) LIKE '%7504%zim%';

UPDATE properties SET "currentValue" = 921181.42, "updatedAt" = NOW()
WHERE LOWER(address) LIKE '%7608%zim%';

UPDATE properties SET "currentValue" = 1995277.42, "updatedAt" = NOW()
WHERE LOWER(address) LIKE '%7700%burthe%';

-- Freret was catastrophically under-valued (~$53k vs ~$1.7M)
UPDATE properties SET "currentValue" = 1703408.87, "updatedAt" = NOW()
WHERE LOWER(address) LIKE '%7313%freret%' OR LOWER(address) LIKE '%7315%freret%';

-- 2) Ensure Campus Rentals LLC entity owners (Steven 51% / Alec 49%)
INSERT INTO entity_owners (id, "entityId", "userId", "ownershipPercentage", "investmentAmount", "isActive", "createdAt", "updatedAt")
SELECT
  substr(md5(random()::text || clock_timestamp()::text), 1, 25),
  e.id,
  u.id,
  51,
  0,
  true,
  NOW(),
  NOW()
FROM entities e
JOIN users u ON LOWER(u.email) = 'srovner@dial-law.com'
WHERE e.name = 'Campus Rentals LLC'
  AND NOT EXISTS (
    SELECT 1 FROM entity_owners eo
    WHERE eo."entityId" = e.id AND eo."userId" = u.id
  );

INSERT INTO entity_owners (id, "entityId", "userId", "ownershipPercentage", "investmentAmount", "isActive", "createdAt", "updatedAt")
SELECT
  substr(md5(random()::text || clock_timestamp()::text), 1, 25),
  e.id,
  u.id,
  49,
  0,
  true,
  NOW(),
  NOW()
FROM entities e
JOIN LATERAL (
  SELECT id FROM users
  WHERE LOWER(email) IN ('rovnerproperties@gmail.com', 'arovner@campusrentalsllc.com')
  ORDER BY CASE LOWER(email)
    WHEN 'rovnerproperties@gmail.com' THEN 0
    ELSE 1
  END
  LIMIT 1
) u ON true
WHERE e.name = 'Campus Rentals LLC'
  AND NOT EXISTS (
    SELECT 1 FROM entity_owners eo
    WHERE eo."entityId" = e.id AND eo."userId" = u.id
  );

-- 3) EIN should not be broadly public
UPDATE documents SET "isPublic" = false, "updatedAt" = NOW()
WHERE LOWER(title) = 'ein' AND "isPublic" = true;

-- 4) Remove empty debt-directory stub docs (filePath is NOT NULL)
DELETE FROM documents
WHERE "filePath" IN ('/documents/debt/', 'documents/debt/', '/documents/debt');
