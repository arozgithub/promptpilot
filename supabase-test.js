// Quick setup script to test if Supabase integration is working
// Run this in the browser console after setting up Supabase

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not found');
    console.log('Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
    return false;
  }
  
  console.log('✅ Environment variables found');
  console.log('📍 Supabase URL:', supabaseUrl);
  
  try {
    // Try to fetch data
    const response = await fetch(`${supabaseUrl}/rest/v1/prompt_groups`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Successfully connected to Supabase');
      console.log('📊 Found', data.length, 'prompt groups');
      return true;
    } else {
      console.error('❌ Failed to connect to Supabase:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
}

async function migrateLocalStorageToSupabase() {
  console.log('Checking for localStorage data to migrate...');
  
  const localData = localStorage.getItem('prompt-groups');
  if (!localData) {
    console.log('ℹ️ No localStorage data found to migrate');
    return;
  }
  
  try {
    const groups = JSON.parse(localData);
    console.log('📦 Found', groups.length, 'groups in localStorage');
    
    // This would require the supabasePromptService to be available
    // For now, just log what would be migrated
    groups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name} (${group.versions?.length || 0} versions)`);
    });
    
    console.log('💡 To migrate this data, you\'ll need to recreate these prompts using the UI');
  } catch (error) {
    console.error('❌ Error parsing localStorage data:', error);
  }
}

// Run the tests
testSupabaseConnection().then(success => {
  if (success) {
    migrateLocalStorageToSupabase();
  }
});