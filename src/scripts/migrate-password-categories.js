/**
 * Password Categories Migration Script
 * Migrates password entries from string categories to category IDs
 */

const CategoryService = require('../server/services/CategoryService');
const { query } = require('../server/database/connection');
const { auditLog } = require('../server/utils/logger');

/**
 * Migration steps:
 * 1. Add category_id column to password_entries
 * 2. Migrate existing category strings to category IDs
 * 3. Remove old category column
 * 4. Update constraints and indexes
 */

/**
 * Step 1: Add category_id column
 */
async function addCategoryIdColumn() {
  console.log('🔧 MIGRATION: Adding category_id column to password_entries...');
  
  try {
    // Check if column already exists
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'password_entries' 
      AND column_name = 'category_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ MIGRATION: category_id column already exists');
      return true;
    }
    
    // Add the new column
    await query(`
      ALTER TABLE password_entries 
      ADD COLUMN category_id INTEGER REFERENCES password_categories(id) ON DELETE SET NULL
    `);
    
    console.log('✅ MIGRATION: category_id column added successfully');
    return true;
    
  } catch (error) {
    console.error('❌ MIGRATION: Failed to add category_id column:', error);
    throw error;
  }
}

/**
 * Step 2: Migrate existing categories
 */
async function migrateCategoryData() {
  console.log('🔧 MIGRATION: Migrating existing category data...');
  
  try {
    const categoryService = new CategoryService();
    
    // Get all existing categories from password_categories table
    const categories = await categoryService.getPasswordCategories();
    console.log(`📊 MIGRATION: Found ${categories.length} categories`);
    
    // Get all password entries with categories
    const passwordsResult = await query(`
      SELECT id, category 
      FROM password_entries 
      WHERE category IS NOT NULL 
      AND category != '' 
      AND category_id IS NULL
    `);
    
    const passwords = passwordsResult.rows;
    console.log(`📊 MIGRATION: Found ${passwords.length} passwords with categories to migrate`);
    
    let migratedCount = 0;
    let unmatchedCount = 0;
    const unmatchedCategories = new Set();
    
    for (const password of passwords) {
      const categoryName = password.category.trim();
      
      // Find matching category (case-insensitive)
      const matchingCategory = categories.find(cat => 
        cat.name.toLowerCase() === categoryName.toLowerCase()
      );
      
      if (matchingCategory) {
        // Update password entry with category_id
        await query(`
          UPDATE password_entries 
          SET category_id = $1 
          WHERE id = $2
        `, [matchingCategory.id, password.id]);
        
        migratedCount++;
        
      } else {
        // Create new category for unmatched category names
        try {
          const newCategory = await categoryService.createPasswordCategory({
            name: categoryName,
            description: `Auto-migrated category: ${categoryName}`,
            color: '#6b7280' // Default gray color
          }, 1); // Admin user ID
          
          // Update password entry with new category_id
          await query(`
            UPDATE password_entries 
            SET category_id = $1 
            WHERE id = $2
          `, [newCategory.id, password.id]);
          
          console.log(`✅ MIGRATION: Created new category "${categoryName}" (ID: ${newCategory.id})`);
          migratedCount++;
          
        } catch (createError) {
          console.warn(`⚠️  MIGRATION: Failed to create category "${categoryName}":`, createError.message);
          unmatchedCategories.add(categoryName);
          unmatchedCount++;
        }
      }
    }
    
    console.log(`📊 MIGRATION: Migration summary:`);
    console.log(`   - Successfully migrated: ${migratedCount} passwords`);
    console.log(`   - Unmatched categories: ${unmatchedCount} passwords`);
    
    if (unmatchedCategories.size > 0) {
      console.log(`⚠️  MIGRATION: Unmatched category names:`);
      unmatchedCategories.forEach(name => console.log(`     • ${name}`));
    }
    
    return { migratedCount, unmatchedCount };
    
  } catch (error) {
    console.error('❌ MIGRATION: Failed to migrate category data:', error);
    throw error;
  }
}

/**
 * Step 3: Remove old category column (optional - for cleanup)
 */
async function removeOldCategoryColumn() {
  console.log('🔧 MIGRATION: Removing old category column...');
  
  try {
    // Check if there are any remaining non-migrated entries
    const remainingResult = await query(`
      SELECT COUNT(*) as count 
      FROM password_entries 
      WHERE category IS NOT NULL 
      AND category != '' 
      AND category_id IS NULL
    `);
    
    const remainingCount = parseInt(remainingResult.rows[0].count);
    
    if (remainingCount > 0) {
      console.warn(`⚠️  MIGRATION: ${remainingCount} passwords still have unmigrated categories. Skipping column removal.`);
      return false;
    }
    
    // Remove the old category column
    await query(`ALTER TABLE password_entries DROP COLUMN category`);
    
    console.log('✅ MIGRATION: Old category column removed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ MIGRATION: Failed to remove old category column:', error);
    throw error;
  }
}

/**
 * Step 4: Add indexes for performance
 */
async function addIndexes() {
  console.log('🔧 MIGRATION: Adding performance indexes...');
  
  try {
    // Add index on category_id for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_password_entries_category_id 
      ON password_entries(category_id)
    `);
    
    console.log('✅ MIGRATION: Performance indexes added successfully');
    return true;
    
  } catch (error) {
    console.error('❌ MIGRATION: Failed to add indexes:', error);
    throw error;
  }
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  console.log('🔍 MIGRATION: Verifying migration results...');
  
  try {
    // Count passwords with category_id
    const withCategoryResult = await query(`
      SELECT COUNT(*) as count 
      FROM password_entries 
      WHERE category_id IS NOT NULL
    `);
    
    // Count passwords without category_id but with old category
    const withoutCategoryResult = await query(`
      SELECT COUNT(*) as count 
      FROM password_entries 
      WHERE category_id IS NULL 
      AND category IS NOT NULL 
      AND category != ''
    `);
    
    // Count total passwords
    const totalResult = await query(`
      SELECT COUNT(*) as count 
      FROM password_entries 
      WHERE is_deleted = false
    `);
    
    const withCategory = parseInt(withCategoryResult.rows[0].count);
    const withoutCategory = parseInt(withoutCategoryResult.rows[0].count);
    const total = parseInt(totalResult.rows[0].count);
    
    console.log(`📊 MIGRATION: Verification results:`);
    console.log(`   - Total passwords: ${total}`);
    console.log(`   - With category_id: ${withCategory}`);
    console.log(`   - Without category_id (old format): ${withoutCategory}`);
    console.log(`   - Migration success rate: ${total > 0 ? ((withCategory / total) * 100).toFixed(1) : 0}%`);
    
    return {
      total,
      withCategory,
      withoutCategory,
      successRate: total > 0 ? (withCategory / total) * 100 : 0
    };
    
  } catch (error) {
    console.error('❌ MIGRATION: Verification failed:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration(options = {}) {
  const { removeOldColumn = false, skipVerification = false } = options;
  
  console.log('🚀 PASSWORD CATEGORIES MIGRATION');
  console.log('================================\n');
  
  try {
    // Step 1: Add category_id column
    await addCategoryIdColumn();
    
    // Step 2: Migrate existing data
    const migrationResult = await migrateCategoryData();
    
    // Step 3: Remove old column (optional)
    if (removeOldColumn) {
      await removeOldCategoryColumn();
    }
    
    // Step 4: Add indexes
    await addIndexes();
    
    // Step 5: Verify results
    let verificationResult = null;
    if (!skipVerification) {
      verificationResult = await verifyMigration();
    }
    
    // Summary
    console.log('\n🎯 MIGRATION: Summary');
    console.log('====================');
    console.log(`✅ Migration completed successfully`);
    console.log(`📊 Migrated passwords: ${migrationResult.migratedCount}`);
    console.log(`⚠️  Unmatched passwords: ${migrationResult.unmatchedCount}`);
    
    if (verificationResult) {
      console.log(`📈 Success rate: ${verificationResult.successRate.toFixed(1)}%`);
    }
    
    if (removeOldColumn) {
      console.log(`🗑️  Old category column removed`);
    } else {
      console.log(`📝 Old category column preserved (use --remove-old-column to remove)`);
    }
    
    return {
      success: true,
      migrationResult,
      verificationResult
    };
    
  } catch (error) {
    console.error('\n💥 MIGRATION: Failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export functions for testing
module.exports = {
  addCategoryIdColumn,
  migrateCategoryData,
  removeOldCategoryColumn,
  addIndexes,
  verifyMigration,
  runMigration
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const removeOldColumn = args.includes('--remove-old-column');
  const skipVerification = args.includes('--skip-verification');
  
  runMigration({ removeOldColumn, skipVerification })
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error);
      process.exit(1);
    });
}
