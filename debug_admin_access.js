const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

console.log('🔍 Debugging Admin Access...\n');

async function debugAdminAccess() {
  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');

    // Test 2: Check admin endpoints
    console.log('\n2️⃣ Testing admin endpoints...');
    const endpointsResponse = await axios.get(`${BASE_URL}/`);
    console.log('Available endpoints:', endpointsResponse.data.endpoints);

    // Test 3: Test admin endpoint without auth (should fail with 401)
    console.log('\n3️⃣ Testing admin endpoint without authentication...');
    try {
      await axios.get(`${BASE_URL}/api/admin/pending-applications`);
    } catch (error) {
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
        
        if (error.response.status === 401) {
          console.log('✅ Endpoint exists, authentication required');
        } else if (error.response.status === 403) {
          console.log('✅ Endpoint exists, admin privileges required');
        } else {
          console.log('❌ Unexpected error');
        }
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Run: SELECT * FROM user_roles WHERE user_role = \'admin\';');
    console.log('3. If no results, create admin user');
    console.log('4. Check browser console for more details');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAdminAccess();
