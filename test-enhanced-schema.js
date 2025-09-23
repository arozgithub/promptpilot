const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testEnhancedPromptCreation() {
  console.log('🧪 Testing Enhanced Prompt Creation with Full Schema Population');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const testName = `Enhanced Test Group ${Date.now()}`;
    const testDescription = 'Testing the enhanced schema population with all fields';
    const testContent = `You are a helpful assistant for testing enhanced schema population.

This prompt tests whether all the schema fields are being properly populated:
- current_version_id
- current_version_name  
- current_version_content
- current_version_number
- production_version_id
- production_version_name
- production_version_content
- production_version_number
- total_versions
- draft_versions
- tags
- is_archived
- sort_order

Please respond helpfully to user queries while we test the database population.`;

    console.log('\n📝 Creating test group with enhanced schema...');
    
    // Create the group with ALL schema fields
    const { data: group, error: groupError } = await supabase
      .from('prompt_groups')
      .insert({
        name: testName,
        description: testDescription,
        tags: ['test', 'enhanced', 'schema'],
        is_archived: false,
        sort_order: 1,
        current_version_name: `${testName} v1`,
        current_version_content: testContent,
        current_version_number: 1,
        production_version_name: `${testName} v1`,
        production_version_content: testContent,
        production_version_number: 1,
        total_versions: 1,
        draft_versions: 1
      })
      .select()
      .single();

    if (groupError) {
      console.error('❌ Group creation error:', groupError);
      return;
    }

    console.log('✅ Group created with enhanced schema!');
    console.log('   ID:', group.id);
    console.log('   Name:', group.name);
    console.log('   Description:', group.description);
    console.log('   Tags:', group.tags);
    console.log('   Total Versions:', group.total_versions);
    console.log('   Draft Versions:', group.draft_versions);
    console.log('   Current Version Name:', group.current_version_name);
    console.log('   Production Version Name:', group.production_version_name);

    // Create the version record
    console.log('\n📝 Creating version record...');
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
      return;
    }

    console.log('✅ Version record created!');
    console.log('   Version ID:', version.id);
    console.log('   Group ID:', version.group_id);
    console.log('   Content Length:', version.content.length);

    // Update group with actual version IDs
    console.log('\n🔄 Updating group with version IDs...');
    const { data: updatedGroup, error: updateError } = await supabase
      .from('prompt_groups')
      .update({
        current_version_id: version.id,
        production_version_id: version.id
      })
      .eq('id', group.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Group update error:', updateError);
      return;
    }

    console.log('✅ Group updated with version IDs!');
    console.log('   Current Version ID:', updatedGroup.current_version_id);
    console.log('   Production Version ID:', updatedGroup.production_version_id);

    // Verify all fields are populated
    console.log('\n🔍 Verifying all schema fields are populated:');
    const allFields = [
      'id', 'name', 'description', 'created_at', 'updated_at', 'user_id',
      'tags', 'is_archived', 'sort_order', 'current_version_id', 'current_version_name',
      'current_version_content', 'current_version_number', 'production_version_id',
      'production_version_name', 'production_version_content', 'production_version_number',
      'total_versions', 'draft_versions'
    ];

    const populatedFields = [];
    const emptyFields = [];

    allFields.forEach(field => {
      const value = updatedGroup[field];
      if (value !== null && value !== undefined) {
        populatedFields.push(field);
      } else {
        emptyFields.push(field);
      }
    });

    console.log(`✅ Populated fields (${populatedFields.length}/${allFields.length}):`);
    populatedFields.forEach(field => {
      const value = updatedGroup[field];
      const displayValue = typeof value === 'string' && value.length > 50 
        ? `${value.substring(0, 50)}...` 
        : value;
      console.log(`   ✓ ${field}: ${displayValue}`);
    });

    if (emptyFields.length > 0) {
      console.log(`⚠️ Empty fields (${emptyFields.length}):`);
      emptyFields.forEach(field => {
        console.log(`   ○ ${field}: null/undefined`);
      });
    }

    // Test cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('prompt_versions').delete().eq('id', version.id);
    await supabase.from('prompt_groups').delete().eq('id', group.id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Enhanced schema test completed successfully!');
    console.log(`📊 Result: ${populatedFields.length}/${allFields.length} fields populated`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testEnhancedPromptCreation().catch(console.error);