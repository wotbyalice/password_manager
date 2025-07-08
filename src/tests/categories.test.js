/**
 * Categories Test Suite
 * Tests for CategoryManager UI functionality
 */

const request = require('supertest');
const app = require('../server/app');

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="categories-grid"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Load the CategoryManager class
require('../renderer/js/categories');

describe('CategoryManager', () => {
    let categoryManager;
    let mockCategories;

    beforeEach(() => {
        // Reset DOM
        document.getElementById('categories-grid').innerHTML = '';
        
        // Mock categories data
        mockCategories = [
            {
                id: 1,
                name: 'Email',
                description: 'Email accounts and services',
                color: '#ef4444',
                passwordCount: 5
            },
            {
                id: 2,
                name: 'Banking',
                description: 'Financial services',
                color: '#059669',
                passwordCount: 3
            }
        ];

        // Mock the global categoriesManager
        global.window.categoriesManager = {
            loadCategories: jest.fn().mockResolvedValue(),
            getCategories: jest.fn().mockReturnValue(mockCategories)
        };

        // Create CategoryManager instance
        categoryManager = new window.CategoryManager();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default properties', () => {
            expect(categoryManager.categories).toEqual([]);
            expect(categoryManager.isLoading).toBe(false);
            expect(categoryManager.editingCategoryId).toBe(null);
        });

        test('should set up event listeners on init', () => {
            const setupEventListenersSpy = jest.spyOn(categoryManager, 'setupEventListeners');
            const loadCategoriesSpy = jest.spyOn(categoryManager, 'loadCategories');
            
            categoryManager.init();
            
            expect(setupEventListenersSpy).toHaveBeenCalled();
            expect(loadCategoriesSpy).toHaveBeenCalled();
        });
    });

    describe('Category Loading', () => {
        test('should load categories successfully', async () => {
            await categoryManager.loadCategories();
            
            expect(window.categoriesManager.loadCategories).toHaveBeenCalled();
            expect(window.categoriesManager.getCategories).toHaveBeenCalled();
            expect(categoryManager.categories).toEqual(mockCategories);
        });

        test('should handle loading errors gracefully', async () => {
            const error = new Error('Failed to load categories');
            window.categoriesManager.loadCategories.mockRejectedValue(error);
            
            const renderErrorStateSpy = jest.spyOn(categoryManager, 'renderErrorState');
            
            await categoryManager.loadCategories();
            
            expect(renderErrorStateSpy).toHaveBeenCalledWith('Failed to load categories');
        });
    });

    describe('Category Rendering', () => {
        test('should render categories grid with category cards', () => {
            categoryManager.categories = mockCategories;
            categoryManager.renderCategories();
            
            const grid = document.getElementById('categories-grid');
            expect(grid.innerHTML).toContain('Email');
            expect(grid.innerHTML).toContain('Banking');
            expect(grid.innerHTML).toContain('category-card');
        });

        test('should render empty state when no categories', () => {
            categoryManager.categories = [];
            categoryManager.renderCategories();
            
            const grid = document.getElementById('categories-grid');
            expect(grid.innerHTML).toContain('No Categories Yet');
            expect(grid.innerHTML).toContain('empty-state');
        });

        test('should render individual category card correctly', () => {
            const category = mockCategories[0];
            const cardHtml = categoryManager.renderCategoryCard(category);
            
            expect(cardHtml).toContain('Email');
            expect(cardHtml).toContain('Email accounts and services');
            expect(cardHtml).toContain('--category-color: #ef4444');
            expect(cardHtml).toContain('5'); // password count
            expect(cardHtml).toContain('edit-category-btn');
            expect(cardHtml).toContain('delete-category-btn');
        });

        test('should handle category without description', () => {
            const category = { ...mockCategories[0], description: null };
            const cardHtml = categoryManager.renderCategoryCard(category);
            
            expect(cardHtml).toContain('Email');
            expect(cardHtml).not.toContain('category-description');
        });
    });

    describe('State Rendering', () => {
        test('should render loading state', () => {
            categoryManager.renderLoadingState();
            
            const grid = document.getElementById('categories-grid');
            expect(grid.innerHTML).toContain('Loading categories...');
            expect(grid.innerHTML).toContain('loading-spinner');
        });

        test('should render error state', () => {
            const errorMessage = 'Network error';
            categoryManager.renderErrorState(errorMessage);
            
            const grid = document.getElementById('categories-grid');
            expect(grid.innerHTML).toContain('Failed to Load Categories');
            expect(grid.innerHTML).toContain('Network error');
            expect(grid.innerHTML).toContain('Try Again');
        });
    });

    describe('HTML Escaping', () => {
        test('should escape HTML in category names', () => {
            const maliciousCategory = {
                id: 1,
                name: '<script>alert("xss")</script>',
                description: '<img src=x onerror=alert("xss")>',
                color: '#ff0000',
                passwordCount: 0
            };
            
            const cardHtml = categoryManager.renderCategoryCard(maliciousCategory);
            
            expect(cardHtml).not.toContain('<script>');
            expect(cardHtml).not.toContain('<img src=x');
            expect(cardHtml).toContain('&lt;script&gt;');
        });
    });

    describe('Event Handling', () => {
        test('should set up add category button event listener', () => {
            // Add button to DOM
            document.body.innerHTML += '<button id="add-category-btn">Add Category</button>';
            
            const showAddCategoryModalSpy = jest.spyOn(categoryManager, 'showAddCategoryModal');
            categoryManager.setupEventListeners();
            
            // Simulate button click
            document.getElementById('add-category-btn').click();
            
            expect(showAddCategoryModalSpy).toHaveBeenCalled();
        });
    });
});

describe('Categories API Integration', () => {
    test('should get categories from API', async () => {
        const response = await request(app)
            .get('/api/passwords/categories')
            .expect(401); // Should require authentication
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('token');
    });
});
