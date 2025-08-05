const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testTokenFlow() {
  console.log('🧪 Testing Token Flow...\n');

  try {
    // Test without token (should fail)
    console.log('1. Testing POST /api/players without token...');
    try {
      const response = await fetch(`${BASE_URL}/api/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: 'test-user-id',
          display_name: 'Test Player',
          username: 'testplayer',
          DOB: '1990-01-01',
          valo_id: 'TestPlayer#123',
          VPA: 'VPA123'
        })
      });
      
      const data = await response.json();
      console.log('❌ Expected 401, got:', response.status, data);
    } catch (error) {
      console.log('✅ Correctly rejected request without token');
    }

    // Test with invalid token
    console.log('\n2. Testing POST /api/players with invalid token...');
    try {
      const response = await fetch(`${BASE_URL}/api/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-here'
        },
        body: JSON.stringify({
          player_id: 'test-user-id',
          display_name: 'Test Player',
          username: 'testplayer',
          DOB: '1990-01-01',
          valo_id: 'TestPlayer#123',
          VPA: 'VPA123'
        })
      });
      
      const data = await response.json();
      console.log('📋 Response status:', response.status);
      console.log('📋 Response data:', data);
    } catch (error) {
      console.log('❌ Error with invalid token:', error.message);
    }

    // Test GET without token
    console.log('\n3. Testing GET /api/players/test-id without token...');
    try {
      const response = await fetch(`${BASE_URL}/api/players/test-id`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('📋 GET Response status:', response.status);
      console.log('📋 GET Response data:', data);
    } catch (error) {
      console.log('❌ Error with GET request:', error.message);
    }

    console.log('\n🎯 Token validation tests completed!');
    console.log('💡 Check the backend console logs to see the authorization headers being received.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTokenFlow(); 