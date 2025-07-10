# Categories Implementation - TDD Development Plan

## Database Schema Analysis & Design

### Current Database Structure

**JSON File Format** (`data/password_manager.json`):
```json
{
  "users": [
    {
      "id": 1,
      "email": "admin@company.com", 
      "password_hash": "$2a$10$...",
      "role": "admin",
      "first_name": "System",
      "last_name": "Administrator",
      "created_at": "2025-07-07T02:24:15.332Z",
      "updated_at": "2025-07-07T02:24:15.333Z"
    }
  ],
  "passwords": [
    {
      "id": 1,
      "title": "Company Email",
      "username": "admin@company.com",
      "encrypted_password": "Q29tcGFueUVtYWlsMTIzIQ==",
      "url": "https://mail.company.com",
      "notes": "Main company email account",
      "category": "Email",  // String-based category (current)
      "user_id": 1,
      "created_at": "2025-07-07T01:54:50.590Z",
      "updated_at": "2025-07-07T01:54:50.590Z"
    }
  ],
  "audit_logs": []
}
```

### Issues with Current Structure

1. **No Categories Table**: Categories are stored as strings in password entries
2. **No Category Management**: No way to create, edit, or delete categories
3. **No Category Metadata**: No colors, descriptions, or statistics
4. **Inconsistent Data**: Category names can be inconsistent (e.g., "Email" vs "email")

### Proposed Categories Schema

**Add to JSON structure**:
```json
{
  "users": [...],
  "passwords": [...],
  "password_categories": [
    {
      "id": 1,
      "name": "Email",
      "description": "Email accounts and services", 
      "color": "#ef4444",
      "created_by": 1,
      "created_at": "2025-07-10T20:00:00.000Z"
    }
  ],
  "audit_logs": [...]
}
```

### Default Categories to Implement

1. **Email** (#ef4444) - Email accounts and services
2. **Social Media** (#8b5cf6) - Social networking platforms  
3. **Banking** (#059669) - Financial and banking services
4. **Work** (#0ea5e9) - Business and productivity tools
5. **WiFi** (#f59e0b) - Network and WiFi credentials
6. **Servers** (#6366f1) - Server and infrastructure access
7. **Software** (#ec4899) - Software licenses and accounts

### Migration Strategy

1. **Phase 1**: Add `password_categories` array to JSON structure
2. **Phase 2**: Populate default categories
3. **Phase 3**: Update SQLite adapter to handle categories table
4. **Phase 4**: Migrate existing password entries to use category IDs
5. **Phase 5**: Update password service to work with new structure

## Implementation Plan - TDD Approach

### Step 1: Backend Categories Service (TDD)
- [ ] Write tests for CategoryService interface
- [ ] Implement CategoryService with SQLite adapter support
- [ ] Add category CRUD operations
- [ ] Add category statistics functionality

### Step 2: API Endpoints (TDD) 
- [ ] Write API endpoint tests
- [ ] Implement REST endpoints for categories
- [ ] Add validation and error handling
- [ ] Add authentication/authorization

### Step 3: Frontend Categories Manager (TDD)
- [ ] Write unit tests for CategoriesManager class
- [ ] Implement categories data management
- [ ] Add API integration
- [ ] Add real-time updates

### Step 4: UI Components (TDD)
- [ ] Write component tests
- [ ] Implement categories view
- [ ] Add category cards and modals
- [ ] Add category management forms

### Step 5: Integration & Migration
- [ ] End-to-end testing
- [ ] Data migration scripts
- [ ] Password-category integration
- [ ] Final testing and documentation

## Technical Requirements

### SQLite Adapter Updates Needed

1. **Add Categories Support**: Handle `password_categories` table operations
2. **Category CRUD**: Create, Read, Update, Delete operations
3. **Category Statistics**: Count passwords per category
4. **Data Migration**: Convert string categories to category IDs

### API Endpoints to Implement

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)
- `GET /api/categories/stats` - Get category statistics

### Frontend Components Needed

1. **CategoriesView**: Main categories page
2. **CategoryCard**: Individual category display
3. **CategoryModal**: Add/edit category form
4. **CategoryFilter**: Filter passwords by category
5. **CategoryStats**: Display category statistics

## Testing Strategy

### Unit Tests
- CategoryService methods
- SQLite adapter category operations
- API endpoint handlers
- Frontend component logic

### Integration Tests
- End-to-end category workflows
- Database migration scripts
- API integration with frontend
- Real-time updates

### Test Data
- Sample categories with various properties
- Edge cases (empty categories, special characters)
- Performance tests with large datasets
