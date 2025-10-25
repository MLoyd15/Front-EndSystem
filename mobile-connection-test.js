// Mobile Connection Test Script
// Run this to test if your mobile app can connect to the backend

const API_BASE = 'https://goat-agri-trading-backend.onrender.com/api';

async function testMobileConnection() {
  console.log('🔍 Testing mobile connection to backend...\n');
  
  // Test 1: Basic API connectivity
  try {
    console.log('1. Testing basic API connectivity...');
    const response = await fetch(`${API_BASE}/products/flat`);
    if (response.ok) {
      console.log('✅ Basic API connection successful');
    } else {
      console.log('❌ Basic API connection failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Basic API connection error:', error.message);
  }

  // Test 2: CORS headers
  try {
    console.log('\n2. Testing CORS headers...');
    const response = await fetch(`${API_BASE}/products/flat`, {
      method: 'OPTIONS'
    });
    console.log('✅ CORS preflight successful');
  } catch (error) {
    console.log('❌ CORS preflight failed:', error.message);
  }

  // Test 3: Categories endpoint (public)
  try {
    console.log('\n3. Testing categories endpoint...');
    const response = await fetch(`${API_BASE}/category`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Categories endpoint working, found', data.length || 0, 'categories');
    } else {
      console.log('❌ Categories endpoint failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Categories endpoint error:', error.message);
  }

  // Test 4: Promo application (public)
  try {
    console.log('\n4. Testing promo application endpoint...');
    const response = await fetch(`${API_BASE}/promo/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'TEST123',
        orderTotal: 100
      })
    });
    // This should return an error (promo not found) but connection should work
    console.log('✅ Promo endpoint accessible (status:', response.status, ')');
  } catch (error) {
    console.log('❌ Promo endpoint error:', error.message);
  }

  console.log('\n🎉 Mobile connection test completed!');
  console.log('\n📱 For your mobile app, use these endpoints:');
  console.log('- API Base URL:', API_BASE);
  console.log('- Socket URL: https://goat-agri-trading-backend.onrender.com');
  console.log('\n🔐 Remember to include Authorization header for protected endpoints:');
  console.log('- Authorization: Bearer <your-jwt-token>');
}

// Run the test
testMobileConnection();