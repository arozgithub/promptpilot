// Supabase Integration Test Script
// Run this in the browser console (F12 -> Console) to test your connection

console.log('🧪 Testing Supabase Integration...');

// Test 1: Check environment variables
console.log('📋 Step 1: Checking environment variables...');
if (typeof window !== 'undefined') {
  // Check if env vars are loaded (they won't be directly accessible in browser)
  console.log('✅ Running in browser environment');
  
  // Test 2: Try to make a direct API call to Supabase
  const testSupabaseConnection = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oyjbpgxypxppbnywhwxl.supabase.co';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95amJwZ3h5cHhwcGJueXdod3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzg0OTEsImV4cCI6MjA3MzcxNDQ5MX0.W-Xln_BjI00_LlM7dnjOqjmtl-45qaZgLA-db6BLnFA';
      
      console.log('🌐 Step 2: Testing direct API connection...');
      console.log('📡 Supabase URL:', supabaseUrl);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/prompt_groups?select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Supabase connection successful!');
        console.log('📊 Found', data.length, 'prompt groups');
        console.log('📋 Sample data:', data.slice(0, 2));
        return true;
      } else {
        console.error('❌ Supabase connection failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      return false;
    }
  };
  
  // Test 3: Check localStorage for comparison
  const checkLocalStorage = () => {
    console.log('💾 Step 3: Checking localStorage for comparison...');
    const localData = localStorage.getItem('prompt-groups');
    if (localData) {
      try {
        const groups = JSON.parse(localData);
        console.log('📦 Found', groups.length, 'groups in localStorage');
      } catch (e) {
        console.log('⚠️ Invalid localStorage data');
      }
    } else {
      console.log('📭 No localStorage data found');
    }
  };
  
  // Run all tests
  const runAllTests = async () => {
    checkLocalStorage();
    const supabaseWorks = await testSupabaseConnection();
    
    console.log('\n🎯 Test Results Summary:');
    console.log('- Environment: ✅ Browser');
    console.log(`- Supabase API: ${supabaseWorks ? '✅ Connected' : '❌ Failed'}`);
    
    if (supabaseWorks) {
      console.log('\n🚀 Integration is working! You can now:');
      console.log('1. Create prompts through the UI');
      console.log('2. They will be saved to Supabase');
      console.log('3. Check the data in your Supabase dashboard');
    } else {
      console.log('\n🔧 Troubleshooting needed. Check:');
      console.log('1. Environment variables in .env.local');
      console.log('2. Supabase project status');
      console.log('3. Database schema was created correctly');
    }
  };
  
  runAllTests();
} else {
  console.log('❌ Not running in browser environment');
}

// Export for manual testing
window.testSupabase = testSupabaseConnection;