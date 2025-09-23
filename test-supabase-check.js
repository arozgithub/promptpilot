const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection and data...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('📡 Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('🔑 Supabase Key:', supabaseAnonKey ? 'Set' : 'Missing');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test connection
    console.log('\n🧪 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('prompt_groups')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection error:', testError);
      return;
    }
    console.log('✅ Connection successful');
    
    // Check current data in prompt_groups
    console.log('\n📊 Checking prompt_groups table...');
    const { data: groups, error: groupsError } = await supabase
      .from('prompt_groups')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (groupsError) {
      console.error('❌ Error fetching prompt_groups:', groupsError);
    } else {
      console.log(`📈 Found ${groups.length} groups in prompt_groups table`);
      groups.forEach((group, index) => {
        console.log(`   ${index + 1}. ${group.name} (ID: ${group.id})`);
        console.log(`      Description: ${group.description || 'No description'}`);
        console.log(`      Created: ${group.created_at}`);
        console.log(`      User ID: ${group.user_id || 'No user'}`);
        console.log(`      Versions: ${group.total_versions || 0}`);
        console.log('');
      });
    }
    
    // Check if there's a prompt_versions table
    console.log('\n📊 Checking prompt_versions table...');
    const { data: versions, error: versionsError } = await supabase
      .from('prompt_versions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (versionsError) {
      console.error('❌ Error fetching prompt_versions:', versionsError);
    } else {
      console.log(`📈 Found ${versions.length} versions in prompt_versions table`);
      versions.forEach((version, index) => {
        console.log(`   ${index + 1}. ${version.name} (ID: ${version.id})`);
        console.log(`      Group ID: ${version.group_id}`);
        console.log(`      Content length: ${version.content?.length || 0} chars`);
        console.log(`      Created: ${version.created_at}`);
        console.log('');
      });
    }
    
    // Test a simple insert to see if permissions work
    console.log('\n🧪 Testing insert permissions...');
    const testGroup = {
      name: `Test Group ${Date.now()}`,
      description: 'Test description for permissions check',
      user_id: null, // Will be set by RLS if configured
      tags: ['test'],
      is_archived: false,
      sort_order: 0
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('prompt_groups')
      .insert([testGroup])
      .select();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      console.error('   This might indicate permission/RLS issues');
    } else {
      console.log('✅ Insert test successful!');
      console.log('   Created group:', insertData[0].name);
      
      // Clean up test data
      await supabase
        .from('prompt_groups')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Test data cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSupabaseConnection().catch(console.error);