const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

console.log('🧪 Testing Admin Endpoints with Authentication...\n');

async function testAdminWithToken() {
  try {
    console.log('📋 Instructions:');
    console.log('1. Get your JWT token from browser localStorage or Supabase');
    console.log('2. Replace "YOUR_JWT_TOKEN" below with your actual token');
    console.log('3. Run this script to test admin endpoints\n');

    // Replace this with your actual JWT token
    const token = 'YOUR_JWT_TOKEN';
    
    if (token === 'YOUR_JWT_TOKEN') {
      console.log('❌ Please replace YOUR_JWT_TOKEN with your actual token');
      console.log('\nTo get your token:');
      console.log('1. Open browser developer tools (F12)');
      console.log('2. Go to Application/Storage tab');
      console.log('3. Look for localStorage or sessionStorage');
      console.log('4. Find the access_token or JWT token');
      return;
    }

    console.log('🔐 Testing with token...');

    // Test current-hosts endpoint
    console.log('\n1️⃣ Testing /api/admin/current-hosts...');
    try {
      const hostsResponse = await axios.get(`${BASE_URL}/api/admin/current-hosts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Success:', hostsResponse.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data);
    }

    // Test pending-applications endpoint
    console.log('\n2️⃣ Testing /api/admin/pending-applications...');
    try {
      const appsResponse = await axios.get(`${BASE_URL}/api/admin/pending-applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Success:', appsResponse.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

testAdminWithToken();
