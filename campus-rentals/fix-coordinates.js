#!/usr/bin/env node

// Direct coordinate caching fix script
console.log('🗺️ Campus Rentals Coordinate Fix Script\n');

const https = require('https');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function geocodePropertiesDirectly() {
  console.log('📍 Directly geocoding properties using Google Maps API...\n');
  
  // Sample New Orleans properties for testing
  const testProperties = [
    "2422 Joseph St, New Orleans, LA 70118",
    "2424 Joseph St, New Orleans, LA 70115", 
    "7506 Zimple St, New Orleans, LA 70118",
    "1032 Cherokee St, New Orleans, LA 70118",
    "7315 Freret St, New Orleans, LA 70118"
  ];
  
  const googleApiKey = "AIzaSyCMRq-rxm_IqV32dHmhhRshHfCXJHUZmqA"; // From your .env
  
  console.log('🔍 Testing geocoding with sample addresses...\n');
  
  for (const address of testProperties) {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleApiKey}`;
      
      const options = {
        hostname: 'maps.googleapis.com',
        path: `/maps/api/geocode/json?address=${encodedAddress}&key=${googleApiKey}`,
        method: 'GET'
      };
      
      const result = await makeRequest(options);
      
      if (result.status === 'OK' && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        console.log(`✅ ${address}`);
        console.log(`   Coordinates: ${location.lat}, ${location.lng}\n`);
      } else {
        console.log(`❌ Failed to geocode: ${address}`);
        console.log(`   Status: ${result.status}\n`);
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error geocoding ${address}:`, error.message);
    }
  }
}

async function testProductionAPI() {
  console.log('🌐 Testing production API at campusrentalsllc.com...\n');
  
  try {
    const options = {
      hostname: 'campusrentalsllc.com',
      path: '/api/properties',
      method: 'GET',
      headers: {
        'User-Agent': 'Campus-Rentals-Coordinate-Fix/1.0'
      }
    };
    
    const result = await makeRequest(options);
    
    if (Array.isArray(result)) {
      console.log(`✅ Production API working - ${result.length} properties found`);
      
      const withCoords = result.filter(p => p.latitude && p.longitude);
      console.log(`📍 Properties with coordinates: ${withCoords.length}/${result.length}`);
      
      if (withCoords.length === 0) {
        console.log('\n⚠️  No coordinates found - need to trigger geocoding');
        return await triggerProductionGeocoding();
      } else {
        console.log('\n✅ Coordinates found - map should work!');
      }
    } else {
      console.log('❌ Unexpected API response:', result);
    }
    
  } catch (error) {
    console.error('❌ Error testing production API:', error.message);
  }
}

async function triggerProductionGeocoding() {
  console.log('🚀 Triggering coordinate geocoding on production...\n');
  
  try {
    const options = {
      hostname: 'campusrentalsllc.com',
      path: '/api/cache-coordinates',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Campus-Rentals-Coordinate-Fix/1.0'
      }
    };
    
    const data = { action: 'geocode-all-properties' };
    const result = await makeRequest(options, data);
    
    console.log('✅ Geocoding response:', result);
    
  } catch (error) {
    console.error('❌ Error triggering geocoding:', error.message);
    
    if (error.message.includes('404')) {
      console.log('\n💡 Coordinate caching API not found.');
      console.log('   This means the build failed due to the routing conflict.');
      console.log('   Need to fix the Next.js routing issue first.');
    }
  }
}

// Main execution
async function run() {
  console.log('🎯 Choose an option:');
  console.log('1. Test Google Maps API directly');
  console.log('2. Test production API and trigger geocoding');
  console.log();
  
  // For now, run both tests
  await geocodePropertiesDirectly();
  await testProductionAPI();
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Fix the Next.js routing conflict (remove [email] route)');
  console.log('2. Rebuild and redeploy the application');
  console.log('3. Access admin coordinates page: https://campusrentalsllc.com/admin/coordinates');
  console.log('4. Trigger geocoding for all properties');
}

run().catch(console.error);







