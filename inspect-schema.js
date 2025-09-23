const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function inspectTableSchema() {
  console.log('🔍 Inspecting actual table schema...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Get a sample record to see what fields actually exist
    console.log('\n📊 Checking existing prompt_groups structure...');
    const { data: sampleGroups, error: groupsError } = await supabase
      .from('prompt_groups')
      .select('*')
      .limit(1);
    
    if (groupsError) {
      console.error('❌ Error fetching sample group:', groupsError);
      return;
    }
    
    if (sampleGroups && sampleGroups.length > 0) {
      console.log('✅ Found sample group. Available columns:');
      const columns = Object.keys(sampleGroups[0]);
      columns.forEach((column, index) => {
        const value = sampleGroups[0][column];
        const type = typeof value;
        console.log(`   ${index + 1}. ${column} (${type}): ${value}`);
      });
      
      console.log(`\n📈 Total columns in prompt_groups: ${columns.length}`);
    } else {
      console.log('⚠️ No existing groups found to inspect schema');
    }
    
    // Also check prompt_versions structure
    console.log('\n📊 Checking existing prompt_versions structure...');
    const { data: sampleVersions, error: versionsError } = await supabase
      .from('prompt_versions')
      .select('*')
      .limit(1);
    
    if (versionsError) {
      console.error('❌ Error fetching sample version:', versionsError);
      return;
    }
    
    if (sampleVersions && sampleVersions.length > 0) {
      console.log('✅ Found sample version. Available columns:');
      const columns = Object.keys(sampleVersions[0]);
      columns.forEach((column, index) => {
        const value = sampleVersions[0][column];
        const type = typeof value;
        const displayValue = typeof value === 'string' && value.length > 100 
          ? `${value.substring(0, 100)}...` 
          : value;
        console.log(`   ${index + 1}. ${column} (${type}): ${displayValue}`);
      });
      
      console.log(`\n📈 Total columns in prompt_versions: ${columns.length}`);
    } else {
      console.log('⚠️ No existing versions found to inspect schema');
    }
    
    // Try to create a simple group to test what fields are actually required/available
    console.log('\n🧪 Testing simple group creation...');
    const testName = `Schema Test ${Date.now()}`;
    
    const { data: testGroup, error: testError } = await supabase
      .from('prompt_groups')
      .insert({
        name: testName,
        description: 'Testing actual available fields'
      })
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Simple test failed:', testError);
    } else {
      console.log('✅ Simple group creation successful!');
      console.log('   Created fields:');
      Object.keys(testGroup).forEach(key => {
        console.log(`   ${key}: ${testGroup[key]}`);
      });
      
      // Clean up
      await supabase.from('prompt_groups').delete().eq('id', testGroup.id);
      console.log('🧹 Test data cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

inspectTableSchema().catch(console.error);