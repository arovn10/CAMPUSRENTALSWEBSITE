// Test geocoding function
async function testGeocoding() {
  // Manual coordinates for testing
  const NEW_ORLEANS_COORDINATES = {
    '2422 Joseph St, New Orleans, LA 70118': { lat: 29.9389, lng: -90.1267 },
    '2424 Joseph St, New Orleans, LA 70115': { lat: 29.9389, lng: -90.1267 },
  };

  function getManualCoordinates(address) {
    if (NEW_ORLEANS_COORDINATES[address]) {
      return NEW_ORLEANS_COORDINATES[address];
    }
    return null;
  }

  // Test addresses
  const testAddresses = [
    '2422 Joseph St, New Orleans, LA 70118',
    '2424 Joseph St, New Orleans, LA 70115',
    '7506 Zimple St, New Orleans, LA 70118'
  ];

  console.log('Testing geocoding...');
  
  for (const address of testAddresses) {
    const coords = getManualCoordinates(address);
    console.log(`${address} -> lat: ${coords?.lat}, lng: ${coords?.lng}`);
  }
}

testGeocoding(); 