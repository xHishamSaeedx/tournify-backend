const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'your-test-token-here'; // Replace with actual test token

// Test data
const testApplication = {
  youtube_channel: 'https://youtube.com/@testchannel',
  experience: 'I have been hosting Valorant tournaments for 2 years with over 1000 participants.',
  motivation: 'I want to help grow the Valorant community and provide high-quality tournament experiences.'
};

async function testHostApplicationAPI() {
  console.log('🧪 Testing Host Applications API...\n');

  try {
    // Test 1: Submit host application
    console.log('📝 Test 1: Submitting host application...');
    const submitResponse = await axios.post(`${BASE_URL}/api/apply-host`, testApplication, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Submit application response:', submitResponse.data);

    // Test 2: Get user's applications
    console.log('\n📋 Test 2: Getting user applications...');
    const getApplicationsResponse = await axios.get(`${BASE_URL}/api/host-applications/my`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    console.log('✅ Get applications response:', getApplicationsResponse.data);

    // Test 3: Get specific application (if we have an ID)
    if (submitResponse.data.success && submitResponse.data.data.id) {
      console.log('\n🔍 Test 3: Getting specific application...');
      const getSpecificResponse = await axios.get(`${BASE_URL}/api/host-applications/${submitResponse.data.data.id}`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });

      console.log('✅ Get specific application response:', getSpecificResponse.data);
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test validation
async function testValidation() {
  console.log('\n🧪 Testing validation...\n');

  try {
    // Test missing required fields
    console.log('📝 Test: Missing required fields...');
    const invalidData = {
      youtube_channel: 'https://youtube.com/@testchannel'
      // Missing experience and motivation
    };

    const response = await axios.post(`${BASE_URL}/api/apply-host`, invalidData, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response:', response.data);

  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Validation working correctly:', error.response.data);
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting Host Applications API Tests...\n');
  
  // Uncomment the line below and replace with actual test token to run tests
  // testHostApplicationAPI();
  // testValidation();
  
  console.log('⚠️  Tests are commented out. Please:');
  console.log('1. Replace TEST_TOKEN with a valid authentication token');
  console.log('2. Uncomment the test function calls');
  console.log('3. Run the tests with: node test-host-applications.js');
}

module.exports = { testHostApplicationAPI, testValidation };
