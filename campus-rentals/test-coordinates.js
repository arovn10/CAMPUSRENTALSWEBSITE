#!/usr/bin/env node

// Test script to check property data and coordinate caching
console.log('🧪 Testing Campus Rentals Property Data and Coordinate Caching...\n');

async function testPropertyAPI() {
  try {
    console.log('📡 Testing local properties API...');
    const response = await fetch('http://localhost:3000/api/properties');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const properties = await response.json();
    console.log(`✅ Properties API working - found ${properties.length} properties`);
    
    // Check if properties have coordinates
    const propertiesWithCoords = properties.filter(p => 
      p.latitude && p.longitude && 
      !isNaN(p.latitude) && !isNaN(p.longitude)
    );
    
    console.log(`📍 Properties with coordinates: ${propertiesWithCoords.length}/${properties.length}`);
    
    if (propertiesWithCoords.length === 0) {
      console.log('⚠️  No properties have coordinates - coordinate caching needed');
      return testCoordinateCaching();
    } else {
      console.log('✅ Properties have coordinates - map should work!');
      
      // Show sample coordinates
      const sample = propertiesWithCoords[0];
      console.log(`   Sample: ${sample.address} -> ${sample.latitude}, ${sample.longitude}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing properties API:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Server might not be running. Try: npm run dev');
    }
  }
}

async function testCoordinateCaching() {
  try {
    console.log('\n🗺️  Testing coordinate caching API...');
    
    const response = await fetch('http://localhost:3000/api/cache-coordinates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'geocode-all-properties' })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Coordinate caching API response:', result);
    
  } catch (error) {
    console.error('❌ Error testing coordinate caching:', error.message);
    
    if (error.message.includes('404')) {
      console.log('💡 Coordinate caching API not found - likely build issue');
      console.log('   Try rebuilding: npm run build');
    }
  }
}

async function testServerStatus() {
  try {
    console.log('🔄 Testing server status...');
    const response = await fetch('http://localhost:3000/');
    
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    } else {
      console.log(`❌ Server returned ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not responding');
    return false;
  }
}

// Run tests
async function runTests() {
  const serverRunning = await testServerStatus();
  
  if (serverRunning) {
    await testPropertyAPI();
  } else {
    console.log('\n💡 To start the server:');
    console.log('   npm run dev    (for development)');
    console.log('   npm run build && npm start    (for production)');
  }
  
  console.log('\n🔗 Useful URLs:');
  console.log('   Properties page: http://localhost:3000/properties');
  console.log('   Admin coordinates: http://localhost:3000/admin/coordinates');
  console.log('   Properties API: http://localhost:3000/api/properties');
}

runTests().catch(console.error);



