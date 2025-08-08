const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🧪 Testing Admin Page Setup...\n');

console.log('📋 Checklist:');
console.log('1. Backend server running on port 3001');
console.log('2. Frontend server running on port 5173');
console.log('3. Admin user created in database');
console.log('4. Admin page accessible at: http://localhost:5173/admin/manage-hosts\n');

console.log('🔍 Testing backend endpoints...');

async function testBackend() {
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Backend server is running');

    // Test admin endpoints exist
    const endpointsResponse = await axios.get(`${BASE_URL}/`);
    if (endpointsResponse.data.endpoints.admin) {
      console.log('✅ Admin endpoints are configured');
    } else {
      console.log('❌ Admin endpoints not found');
    }

  } catch (error) {
    console.log('❌ Backend server not running or not accessible');
    console.log('   Start backend with: cd tournify-backend && npm start');
  }
}

async function testDatabase() {
  console.log('\n🗄️  Database checks:');
  console.log('1. Go to Supabase SQL Editor');
  console.log('2. Run: SELECT * FROM user_roles WHERE user_role = \'admin\';');
  console.log('3. If no results, create admin user with the create_admin_user.sql script');
}

async function testFrontend() {
  console.log('\n🌐 Frontend checks:');
  console.log('1. Navigate to: http://localhost:5173/admin/manage-hosts');
  console.log('2. If you see "Access denied", admin user not created');
  console.log('3. If you see the admin interface, everything is working!');
}

testBackend();
testDatabase();
testFrontend();

console.log('\n🎯 Expected Results:');
console.log('- Admin page loads with "🏆 Admin - Manage Hosts" header');
console.log('- Two sections: "Current Hosts" and "Pending Applications"');
console.log('- No "Access denied" error');
console.log('- Can see pending applications if any exist');
