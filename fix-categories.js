const SQLiteAdapter = require('./src/server/database/sqlite-adapter');
require('dotenv').config();

async function insertDefaultCategories() {
  console.log('🔧 Fixing categories database...');
  
  try {
    const adapter = new SQLiteAdapter(process.env.SQLITE_PATH || './data/password_manager.json');
    
    // Test connection
    console.log('📍 Testing database connection...');
    const testResult = await adapter.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Check if categories table exists and has data
    try {
      const existingCategories = await adapter.query('SELECT * FROM password_categories');
      console.log(`📊 Found ${existingCategories.rows.length} existing categories`);
      
      if (existingCategories.rows.length > 0) {
        console.log('ℹ️  Categories already exist:');
        existingCategories.rows.forEach(cat => {
          console.log(`   - ${cat.name} (${cat.color})`);
        });
        return;
      }
    } catch (error) {
      console.log('⚠️  Categories table might not exist, will try to create...');
    }
    
    // Insert default categories
    console.log('➕ Inserting default categories...');
    const defaultCategories = [
      { name: 'Email', description: 'Email accounts and services', color: '#ef4444' },
      { name: 'Social Media', description: 'Social networking platforms', color: '#8b5cf6' },
      { name: 'Banking', description: 'Financial and banking services', color: '#059669' },
      { name: 'Work', description: 'Business and productivity tools', color: '#0ea5e9' },
      { name: 'WiFi', description: 'Network and WiFi credentials', color: '#f59e0b' },
      { name: 'Servers', description: 'Server and infrastructure access', color: '#6366f1' },
      { name: 'Software', description: 'Software licenses and accounts', color: '#ec4899' }
    ];
    
    for (const category of defaultCategories) {
      try {
        await adapter.query(
          'INSERT INTO password_categories (name, description, color, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
          [category.name, category.description, category.color, 1, new Date().toISOString()]
        );
        console.log(`✅ Created category: ${category.name}`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`ℹ️  Category already exists: ${category.name}`);
        } else {
          console.error(`❌ Failed to create category ${category.name}:`, error.message);
        }
      }
    }
    
    // Verify categories were created
    const finalCategories = await adapter.query('SELECT * FROM password_categories');
    console.log(`\n🎉 Database now has ${finalCategories.rows.length} categories:`);
    finalCategories.rows.forEach(cat => {
      console.log(`   - ${cat.name}: ${cat.description} (${cat.color})`);
    });
    
    console.log('\n✅ Categories fix completed successfully!');
    console.log('🔄 Please refresh your browser to see the categories.');
    
  } catch (error) {
    console.error('❌ Categories fix failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

insertDefaultCategories();
