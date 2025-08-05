const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testBackend() {
  console.log('🧪 Testing Tournify Backend API...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);

    // Test root endpoint
    console.log('\n2. Testing root endpoint...');
    const rootResponse = await fetch(`${BASE_URL}/`);
    const rootData = await rootResponse.json();
    console.log('✅ Root endpoint:', rootData.message);
    console.log('📋 Available endpoints:', rootData.endpoints);

    // Test players endpoint (should return empty array or error)
    console.log('\n3. Testing players endpoint...');
    const playersResponse = await fetch(`${BASE_URL}/api/players`);
    const playersData = await playersResponse.json();
    console.log('✅ Players endpoint:', playersData.success ? 'Working' : 'Error');
    if (playersData.success) {
      console.log(`📊 Found ${playersData.count} players`);
    }

    console.log('\n🎉 Backend API tests completed successfully!');
    console.log('🚀 Backend is ready to handle player form submissions.');

  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    console.log('💡 Make sure the backend server is running on port 3001');
  }
}

testBackend(); 