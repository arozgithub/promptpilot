// Simple test script to verify Supabase connection
require('dotenv').config({ path: '.env.local' });

// Simulate the environment that the client-side would have
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'Missing');

// Import the Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Supabase client created successfully');

// Test connection by trying to fetch data
async function testConnection() {
  try {
    console.log('🔄 Testing connection to prompt_groups table...');
    
    const { data, error } = await supabase
      .from('prompt_groups')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching from prompt_groups:', error);
      return;
    }

    console.log('✅ Successfully connected to Supabase!');
    console.log('📊 Found', data.length, 'prompt groups');
    console.log('Groups:', data);
    
    // Test creating a new group
    console.log('\n🔄 Testing group creation...');
    
    const { data: newGroup, error: createError } = await supabase
      .from('prompt_groups')
      .insert({
        name: 'Test Group ' + Date.now(),
        description: 'Test group created by test script'
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating group:', createError);
      return;
    }

    console.log('✅ Successfully created test group:', newGroup);
    
    // Clean up - delete the test group
    const { error: deleteError } = await supabase
      .from('prompt_groups')
      .delete()
      .eq('id', newGroup.id);

    if (deleteError) {
      console.error('❌ Error deleting test group:', deleteError);
    } else {
      console.log('🗑️ Cleaned up test group');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();