// Test Database Connection Script
// Run with: node test-database.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.log('Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔗 Testing database connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact' })
      .limit(1);

    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      return;
    }
    console.log('✅ Database connection successful!');

    // Test 2: Check if demo user exists
    console.log('\n2. Checking for demo user...');
    const { data: demoUser, error: demoError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'demo')
      .single();

    if (demoError) {
      console.log('❌ Demo user not found. Make sure you ran the database schema.');
    } else {
      console.log('✅ Demo user found!');
      console.log(`   Name: ${demoUser.name}`);
      console.log(`   Email: ${demoUser.email}`);
      console.log(`   Preferences: ${JSON.stringify(demoUser.preferences, null, 2)}`);
    }

    // Test 3: Check all tables exist
    console.log('\n3. Checking database tables...');
    const tables = ['users', 'chat_sessions', 'concept_mastery', 'learning_paths', 'code_submissions', 'quiz_sessions'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact' })
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table}' not found`);
        } else {
          console.log(`✅ Table '${table}' exists`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' error:`, err.message);
      }
    }

    console.log('\n🎉 Database test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your .env file with the correct Supabase credentials');
    console.log('2. Run your backend server: npm run dev');
    console.log('3. Test the API endpoints');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

testDatabase(); 