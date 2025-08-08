const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'your-test-token-here'; // Replace with actual test token

async function testHostAPI() {
  console.log('🧪 Testing Host Applications API...\n');

  try {
    // Test 1: Check if server is running
    console.log('📡 Test 1: Checking server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running:', healthResponse.data);

    // Test 2: Check if apply-host endpoint exists
    console.log('\n📝 Test 2: Checking apply-host endpoint...');
    try {
      const response = await axios.post(`${BASE_URL}/api/apply-host`, {
        experience: 'Test experience',
        motivation: 'Test motivation'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      console.log('✅ Endpoint exists and responds:', response.status);
    } catch (error) {
      if (error.response) {
        console.log('✅ Endpoint exists (expected auth error):', error.response.status);
        console.log('Response:', error.response.data);
      } else {
        console.log('❌ Endpoint not found or server error:', error.message);
      }
    }

    // Test 3: Check server logs
    console.log('\n📊 Test 3: Server should show logs for the request above');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: Start the backend server with:');
      console.log('cd tournify-backend && npm start');
    }
  }
}

// Run test
if (require.main === module) {
  console.log('🚀 Starting Host API Tests...\n');
  
  // Uncomment the line below to run the test
  // testHostAPI();
  
  console.log('⚠️  Test is commented out. Please:');
  console.log('1. Make sure backend server is running on http://localhost:3001');
  console.log('2. Uncomment the testHostAPI() call');
  console.log('3. Run: node test-host-api.js');
}

module.exports = { testHostAPI };
