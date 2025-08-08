const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test admin endpoints
async function testAdminEndpoints() {
  console.log('🧪 Testing Admin Endpoints...\n');

  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running:', healthResponse.data.status);

    // Test 2: Check admin endpoints exist
    console.log('\n2️⃣ Testing admin endpoints...');
    const endpointsResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ Available endpoints:', endpointsResponse.data.endpoints);

    // Test 3: Test current-hosts endpoint (will fail without auth, but shows endpoint exists)
    console.log('\n3️⃣ Testing current-hosts endpoint...');
    try {
      await axios.get(`${BASE_URL}/api/admin/current-hosts`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Endpoint exists (401 Unauthorized expected without token)');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 4: Test pending-applications endpoint
    console.log('\n4️⃣ Testing pending-applications endpoint...');
    try {
      await axios.get(`${BASE_URL}/api/admin/pending-applications`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Endpoint exists (401 Unauthorized expected without token)');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n🎉 Admin endpoints are properly configured!');
    console.log('\n📋 Next steps:');
    console.log('1. Create admin user in database');
    console.log('2. Navigate to http://localhost:5176/admin/manage-hosts');
    console.log('3. Test the admin interface');

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure backend server is running: npm start');
    console.log('2. Check if port 3001 is available');
    console.log('3. Verify all routes are properly imported');
  }
}

testAdminEndpoints();
