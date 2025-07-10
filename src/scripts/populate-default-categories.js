/**
 * Populate Default Categories Script
 * Creates the default password categories for the WOT Password Manager
 */

const CategoryService = require('../server/services/CategoryService');
const { auditLog } = require('../server/utils/logger');

// Default categories configuration
const DEFAULT_CATEGORIES = [
  {
    name: 'Email',
    description: 'Email accounts and services',
    color: '#ef4444' // Red
  },
  {
    name: 'Social Media',
    description: 'Social networking platforms',
    color: '#8b5cf6' // Purple
  },
  {
    name: 'Banking',
    description: 'Financial and banking services',
    color: '#059669' // Green
  },
  {
    name: 'Work',
    description: 'Business and productivity tools',
    color: '#0ea5e9' // Blue
  },
  {
    name: 'WiFi',
    description: 'Network and WiFi credentials',
    color: '#f59e0b' // Orange
  },
  {
    name: 'Servers',
    description: 'Server and infrastructure access',
    color: '#6366f1' // Indigo
  },
  {
    name: 'Software',
    description: 'Software licenses and accounts',
    color: '#ec4899' // Pink
  }
];

/**
 * Populate default categories
 */
async function populateDefaultCategories() {
  console.log('🔧 CATEGORIES: Starting default categories population...');
  
  try {
    const categoryService = new CategoryService();
    
    // Load existing categories to avoid duplicates
    const existingCategories = await categoryService.getPasswordCategories();
    console.log(`🔧 CATEGORIES: Found ${existingCategories.length} existing categories`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const defaultCategory of DEFAULT_CATEGORIES) {
      try {
        // Check if category already exists
        const exists = existingCategories.find(cat => 
          cat.name.toLowerCase() === defaultCategory.name.toLowerCase()
        );
        
        if (exists) {
          console.log(`🔧 CATEGORIES: Skipping "${defaultCategory.name}" - already exists`);
          skippedCount++;
          continue;
        }
        
        // Create the category (using admin user ID = 1)
        const createdCategory = await categoryService.createPasswordCategory(defaultCategory, 1);
        
        console.log(`✅ CATEGORIES: Created "${createdCategory.name}" (ID: ${createdCategory.id})`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ CATEGORIES: Failed to create "${defaultCategory.name}":`, error.message);
      }
    }
    
    console.log(`🎉 CATEGORIES: Population complete!`);
    console.log(`   - Created: ${createdCount} categories`);
    console.log(`   - Skipped: ${skippedCount} categories (already existed)`);
    console.log(`   - Total: ${createdCount + skippedCount} categories processed`);
    
    // Load final categories list
    const finalCategories = await categoryService.getPasswordCategories();
    console.log(`📊 CATEGORIES: Final count: ${finalCategories.length} categories`);
    
    // Display categories
    console.log('\n📋 CATEGORIES: Current categories:');
    finalCategories.forEach(category => {
      console.log(`   • ${category.name} (${category.color}) - ${category.description}`);
    });
    
    return {
      created: createdCount,
      skipped: skippedCount,
      total: finalCategories.length
    };
    
  } catch (error) {
    console.error('❌ CATEGORIES: Failed to populate default categories:', error);
    throw error;
  }
}

/**
 * Verify categories exist and are properly configured
 */
async function verifyCategories() {
  console.log('\n🔍 CATEGORIES: Verifying categories...');
  
  try {
    const categoryService = new CategoryService();
    const categories = await categoryService.getPasswordCategories();
    
    // Check if all default categories exist
    const missingCategories = [];
    for (const defaultCategory of DEFAULT_CATEGORIES) {
      const exists = categories.find(cat => 
        cat.name.toLowerCase() === defaultCategory.name.toLowerCase()
      );
      
      if (!exists) {
        missingCategories.push(defaultCategory.name);
      }
    }
    
    if (missingCategories.length > 0) {
      console.log(`⚠️  CATEGORIES: Missing categories: ${missingCategories.join(', ')}`);
      return false;
    }
    
    // Verify each category has required properties
    let validCount = 0;
    for (const category of categories) {
      const isValid = category.id && 
                     category.name && 
                     category.description && 
                     category.color &&
                     category.createdBy &&
                     category.createdAt;
      
      if (isValid) {
        validCount++;
      } else {
        console.log(`⚠️  CATEGORIES: Invalid category: ${category.name}`);
      }
    }
    
    console.log(`✅ CATEGORIES: Verification complete - ${validCount}/${categories.length} categories valid`);
    return validCount === categories.length;
    
  } catch (error) {
    console.error('❌ CATEGORIES: Verification failed:', error);
    return false;
  }
}

/**
 * Get category statistics
 */
async function getCategoryStatistics() {
  console.log('\n📊 CATEGORIES: Getting statistics...');
  
  try {
    const categoryService = new CategoryService();
    const stats = await categoryService.getCategoryStats();
    
    console.log(`📈 CATEGORIES: Statistics:`);
    console.log(`   - Total categories: ${stats.length}`);
    
    const totalPasswords = stats.reduce((sum, cat) => sum + cat.passwordCount, 0);
    console.log(`   - Total passwords: ${totalPasswords}`);
    
    if (stats.length > 0) {
      console.log(`   - Categories breakdown:`);
      stats.forEach(stat => {
        console.log(`     • ${stat.name}: ${stat.passwordCount} passwords`);
      });
    }
    
    return stats;
    
  } catch (error) {
    console.error('❌ CATEGORIES: Failed to get statistics:', error);
    return [];
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 WOT Password Manager - Default Categories Setup');
  console.log('================================================\n');
  
  try {
    // 1. Populate default categories
    const result = await populateDefaultCategories();
    
    // 2. Verify categories
    const isValid = await verifyCategories();
    
    // 3. Get statistics
    const stats = await getCategoryStatistics();
    
    // 4. Summary
    console.log('\n🎯 CATEGORIES: Setup Summary');
    console.log('============================');
    console.log(`✅ Categories created: ${result.created}`);
    console.log(`⏭️  Categories skipped: ${result.skipped}`);
    console.log(`📊 Total categories: ${result.total}`);
    console.log(`🔍 Validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`📈 Total passwords: ${stats.reduce((sum, cat) => sum + cat.passwordCount, 0)}`);
    
    if (isValid && result.total >= DEFAULT_CATEGORIES.length) {
      console.log('\n🎉 SUCCESS: Default categories setup completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ ERROR: Categories setup incomplete or invalid');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Export functions for testing
module.exports = {
  populateDefaultCategories,
  verifyCategories,
  getCategoryStatistics,
  DEFAULT_CATEGORIES
};

// Run if called directly
if (require.main === module) {
  main();
}
