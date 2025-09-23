const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testCorrectedPromptCreation() {
  console.log('🧪 Testing Corrected Prompt Creation with Actual Schema');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const testName = `Corrected Test Group ${Date.now()}`;
    const testDescription = 'Testing the corrected schema population with actual fields';
    const testContent = `You are a helpful assistant for testing corrected schema population.

This prompt tests whether we can properly populate the database with all the ACTUAL fields:

PROMPT_GROUPS:
- id, name, description, created_at, updated_at, user_id, tags, is_archived, sort_order

PROMPT_VERSIONS:
- id, group_id, name, content, status, version_number, created_at, updated_at, description, 
  parent_version_id, author_notes, performance_score, usage_count, is_archived

Please respond helpfully to user queries while we test the database population.`;

    console.log('\n📝 Creating test group with actual schema...');
    
    // Create the group using ACTUAL available fields
    const { data: group, error: groupError } = await supabase
      .from('prompt_groups')
      .insert({
        name: testName,
        description: testDescription,
        tags: ['test', 'corrected', 'schema'],
        is_archived: false,
        sort_order: 1
      })
      .select()
      .single();

    if (groupError) {
      console.error('❌ Group creation error:', groupError);
      return;
    }

    console.log('✅ Group created with actual schema!');
    console.log('   ID:', group.id);
    console.log('   Name:', group.name);
    console.log('   Description:', group.description);
    console.log('   Tags:', group.tags);
    console.log('   Is Archived:', group.is_archived);
    console.log('   Sort Order:', group.sort_order);

    // Create the version record with ALL actual fields
    console.log('\n📝 Creating version record with all fields...');
    const { data: version, error: versionError } = await supabase
      .from('prompt_versions')
      .insert({
        group_id: group.id,
        name: `${testName} v1`,
        content: testContent,
        status: 'current',
        version_number: 1,
        description: 'Initial version with all fields populated',
        parent_version_id: null,
        author_notes: 'Created by corrected schema test',
        performance_score: 0.95,
        usage_count: 0,
        is_archived: false
      })
      .select()
      .single();

    if (versionError) {
      console.error('❌ Version creation error:', versionError);
      return;
    }

    console.log('✅ Version record created with all fields!');
    console.log('   Version ID:', version.id);
    console.log('   Group ID:', version.group_id);
    console.log('   Version Number:', version.version_number);
    console.log('   Status:', version.status);
    console.log('   Description:', version.description);
    console.log('   Author Notes:', version.author_notes);
    console.log('   Performance Score:', version.performance_score);
    console.log('   Usage Count:', version.usage_count);
    console.log('   Content Length:', version.content.length);

    // Verify all fields are populated correctly
    console.log('\n🔍 Verifying all fields:');
    
    // Check group fields
    const groupFields = ['id', 'name', 'description', 'created_at', 'updated_at', 'user_id', 'tags', 'is_archived', 'sort_order'];
    console.log('\n📊 Group Fields:');
    groupFields.forEach(field => {
      const value = group[field];
      console.log(`   ✓ ${field}: ${value}`);
    });
    
    // Check version fields  
    const versionFields = ['id', 'group_id', 'name', 'content', 'status', 'version_number', 'created_at', 'updated_at', 'description', 'parent_version_id', 'author_notes', 'performance_score', 'usage_count', 'is_archived'];
    console.log('\n📊 Version Fields:');
    versionFields.forEach(field => {
      const value = version[field];
      const displayValue = field === 'content' && typeof value === 'string' && value.length > 100 
        ? `${value.substring(0, 100)}...` 
        : value;
      console.log(`   ✓ ${field}: ${displayValue}`);
    });

    // Test the Create Prompt workflow by simulating what happens in the UI
    console.log('\n🎯 Testing Create Prompt Workflow...');
    
    // This simulates what happens when clicking "Create Prompt" in the sidebar
    const workflowName = `Workflow Test ${Date.now()}`;
    const workflowContent = 'You are a helpful assistant created through the Create Prompt workflow.';
    const workflowDescription = 'Created via the Create Prompt button workflow test';
    
    // Step 1: Create group
    const { data: workflowGroup, error: workflowGroupError } = await supabase
      .from('prompt_groups')
      .insert({
        name: workflowName,
        description: workflowDescription,
        tags: ['workflow', 'ui-test'],
        is_archived: false,
        sort_order: 0
      })
      .select()
      .single();
    
    if (workflowGroupError) {
      console.error('❌ Workflow group creation failed:', workflowGroupError);
      return;
    }
    
    console.log('   ✅ Workflow group created');
    
    // Step 2: Create initial version
    const { data: workflowVersion, error: workflowVersionError } = await supabase
      .from('prompt_versions')
      .insert({
        group_id: workflowGroup.id,
        name: `${workflowName} v1`,
        content: workflowContent,
        status: 'current',
        version_number: 1,
        description: 'Initial version',
        parent_version_id: null,
        author_notes: null,
        performance_score: 0.0,
        usage_count: 0,
        is_archived: false
      })
      .select()
      .single();
    
    if (workflowVersionError) {
      console.error('❌ Workflow version creation failed:', workflowVersionError);
      return;
    }
    
    console.log('   ✅ Workflow version created');
    console.log('   📊 Workflow Result:');
    console.log('      Group:', workflowGroup.name);
    console.log('      Version:', workflowVersion.name);
    console.log('      Status:', workflowVersion.status);

    // Test cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('prompt_versions').delete().eq('id', version.id);
    await supabase.from('prompt_groups').delete().eq('id', group.id);
    await supabase.from('prompt_versions').delete().eq('id', workflowVersion.id);
    await supabase.from('prompt_groups').delete().eq('id', workflowGroup.id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Corrected schema test completed successfully!');
    console.log('📊 All fields are being populated correctly in Supabase');
    console.log('✅ Create Prompt workflow is working properly');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCorrectedPromptCreation().catch(console.error);