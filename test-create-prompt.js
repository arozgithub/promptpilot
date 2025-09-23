// Test script to check what's happening with Supabase inserts
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCreatePrompt() {
  try {
    console.log('🔍 TESTING CREATE PROMPT WORKFLOW');
    console.log('==================================');
    
    // Test data
    const testName = `Test Prompt ${Date.now()}`;
    const testContent = 'This is a test prompt content for testing purposes.';
    const testDescription = 'Test prompt created by verification script';
    
    console.log('📝 Test data:', { testName, testContent, testDescription });
    
    // Step 1: Create the group
    console.log('\n🎯 STEP 1: Creating group...');
    const { data: group, error: groupError } = await supabase
      .from('prompt_groups')
      .insert({
        name: testName,
        description: testDescription
      })
      .select()
      .single();

    if (groupError) {
      console.error('❌ Group creation error:', groupError);
      console.error('Error details:', {
        code: groupError.code,
        message: groupError.message,
        details: groupError.details,
        hint: groupError.hint
      });
      return;
    }

    console.log('✅ Group created successfully:');
    console.log('Group ID:', group.id);
    console.log('Group Name:', group.name);
    console.log('Group Description:', group.description);
    console.log('Created At:', group.created_at);

    // Step 2: Create the initial version
    console.log('\n🎯 STEP 2: Creating initial version...');
    const { data: version, error: versionError } = await supabase
      .from('prompt_versions')
      .insert({
        group_id: group.id,
        name: `${testName} v1`,
        content: testContent,
        status: 'draft'
      })
      .select()
      .single();

    if (versionError) {
      console.error('❌ Version creation error:', versionError);
      console.error('Error details:', {
        code: versionError.code,
        message: versionError.message,
        details: versionError.details,
        hint: versionError.hint
      });
      return;
    }

    console.log('✅ Version created successfully:');
    console.log('Version ID:', version.id);
    console.log('Version Name:', version.name);
    console.log('Version Content:', version.content.substring(0, 50) + '...');
    console.log('Version Status:', version.status);
    console.log('Group ID:', version.group_id);
    console.log('Created At:', version.created_at);

    // Step 3: Verify the data is in the database
    console.log('\n🔍 STEP 3: Verifying data in database...');
    
    // Check groups table
    const { data: allGroups, error: groupsError } = await supabase
      .from('prompt_groups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (groupsError) {
      console.error('❌ Error fetching groups:', groupsError);
    } else {
      console.log(`📊 Total groups in database: ${allGroups.length}`);
      console.log('Latest groups:');
      allGroups.forEach((g, i) => {
        console.log(`  ${i + 1}. ${g.name} (${g.id}) - ${g.created_at}`);
      });
    }

    // Check versions table
    const { data: allVersions, error: versionsError } = await supabase
      .from('prompt_versions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (versionsError) {
      console.error('❌ Error fetching versions:', versionsError);
    } else {
      console.log(`\n📊 Total versions in database: ${allVersions.length}`);
      console.log('Latest versions:');
      allVersions.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.name} (${v.id}) - Group: ${v.group_id} - ${v.created_at}`);
      });
    }

    console.log('\n🎉 Test completed successfully!');
    
    // Optional: Clean up test data
    console.log('\n🗑️ Cleaning up test data...');
    await supabase.from('prompt_versions').delete().eq('group_id', group.id);
    await supabase.from('prompt_groups').delete().eq('id', group.id);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testCreatePrompt();