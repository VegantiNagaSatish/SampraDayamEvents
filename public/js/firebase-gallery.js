/**
 * Firebase Gallery Module
 * Dynamically loads and displays images from Firestore
 */
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase with latest stable version
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Gallery manager class
 */
class FirebaseGallery {
    constructor() {
        this.images = [];
        this.categories = [];
        this.currentFilter = null;
        this.isLoading = false;
        
        // DOM elements
        this.galleryPhotos = document.getElementById('galleryPhotos');
        this.galleryFilterHint = document.getElementById('galleryFilterHint');
        
        // Bind methods to preserve 'this' context
        this.filterGallery = this.filterGallery.bind(this);
        
        this.init();
    }

    async init() {
        try {
            console.log('🔥 Initializing Firebase Gallery...');
            console.log('Firebase config:', firebaseConfig);
            
            await this.loadCategories();
            await this.loadImages();
            this.setupEventListeners();
            this.renderGallery();
            
            console.log('✅ Gallery initialized successfully');
            console.log(`🎯 Final check - Gallery has ${this.images.length} images and ${this.categories.length} categories`);
            
            // Make this gallery instance globally accessible for debugging
            window.galleryDebug = {
                images: this.images,
                categories: this.categories,
                showAll: () => this.filterGallery('all'),
                showCategory: (cat) => this.filterGallery(cat),
                instance: this
            };
            
        } catch (error) {
            console.error('❌ Failed to initialize gallery:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            this.showError(`Failed to load gallery: ${error.message}. Please refresh the page.`);
        }
    }

    /**
     * Load categories from Firestore
     */
    async loadCategories() {
        try {
            const querySnapshot = await getDocs(collection(db, 'categories'));
            this.categories = [];
            
            querySnapshot.forEach((doc) => {
                this.categories.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Sort by sortOrder
            this.categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            
            console.log(`Loaded ${this.categories.length} categories:`, this.categories);
        } catch (error) {
            console.error('Error loading categories:', error);
            throw error;
        }
    }

    /**
     * Load all images from Firestore
     */
    async loadImages() {
        try {
            console.log('🔄 Starting to load images from Firestore...');
            this.showLoading();
            
            const querySnapshot = await getDocs(
                query(collection(db, 'images'), orderBy('uploadedAt', 'desc'))
            );
            
            console.log(`📥 Retrieved ${querySnapshot.size} documents from Firestore`);
            
            this.images = [];
            querySnapshot.forEach((doc) => {
                const imageData = {
                    id: doc.id,
                    ...doc.data()
                };
                this.images.push(imageData);
                
                // Debug: log first few images
                if (this.images.length <= 3) {
                    console.log(`📄 Sample image ${this.images.length}:`, {
                        id: imageData.id,
                        originalName: imageData.originalName,
                        category: imageData.category,
                        downloadURL: imageData.downloadURL ? 'present' : 'missing'
                    });
                }
            });
            
            // Store images both locally and globally
            window.GALLERY_DATA.images = [...this.images];
            
            console.log(`📸 Successfully loaded ${this.images.length} images into array`);
            console.log(`🔍 Images array type:`, Array.isArray(this.images) ? 'Array' : typeof this.images);
            console.log(`🌐 Global images stored: ${window.GALLERY_DATA.images.length}`);
            
            // Debug: Show image categories distribution
            const categoryCount = {};
            this.images.forEach(img => {
                if (img.category) {
                    categoryCount[img.category] = (categoryCount[img.category] || 0) + 1;
                } else {
                    categoryCount['NO_CATEGORY'] = (categoryCount['NO_CATEGORY'] || 0) + 1;
                }
            });
            console.log('📊 Images per category:', categoryCount);
            
            this.hideLoading();
            
            // Verify the images are still accessible
            console.log(`✅ Final verification: this.images.length = ${this.images.length}`);
            
        } catch (error) {
            console.error('❌ Error loading images:', error);
            this.hideLoading();
            throw error;
        }
    }

    /**
     * Load images for a specific category
     */
    async loadImagesByCategory(category) {
        try {
            this.showLoading();
            const querySnapshot = await getDocs(
                query(
                    collection(db, 'images'), 
                    where('category', '==', category),
                    orderBy('uploadedAt', 'desc')
                )
            );
            
            const categoryImages = [];
            querySnapshot.forEach((doc) => {
                categoryImages.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.hideLoading();
            return categoryImages;
        } catch (error) {
            console.error(`Error loading images for category ${category}:`, error);
            this.hideLoading();
            return [];
        }
    }

    /**
     * Setup event listeners for gallery filters
     */
    setupEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('.gallery-filter-btn, .gallery-folder-card');
        
        const self = this; // Capture 'this' context
        
        filterButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const filter = button.getAttribute('data-filter');
                console.log(`🖱️ Filter button clicked: ${filter}`);
                console.log(`🔍 Gallery instance check - images length: ${self.images ? self.images.length : 'undefined'}`);
                
                // Ensure we have a valid gallery instance
                if (!self.images || !Array.isArray(self.images)) {
                    console.error('❌ Gallery images array is invalid, attempting reload...');
                    await self.loadImages();
                }
                
                // Use direct filtering function as backup
                try {
                    await self.filterGallery(filter);
                } catch (error) {
                    console.log('⚠️ Class method failed, using direct function:', error);
                    window.filterGalleryCategory(filter);
                }
                
                // Update active state
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // Photo click for lightbox
        this.galleryPhotos.addEventListener('click', (e) => {
            const img = e.target.closest('img');
            if (img) {
                this.openLightbox(img);
            }
        });
    }

    /**
     * Filter gallery by category
     */
    async filterGallery(category) {
        console.log(`🔍 Filtering gallery by category: ${category}`);
        console.log(`📊 Current images array length: ${this.images.length}`);
        
        // If no images in local array, try to get from global storage
        if (this.images.length === 0) {
            console.log('⚠️ No images in local array, checking global storage...');
            if (window.GALLERY_DATA.images.length > 0) {
                console.log(`🔄 Restoring ${window.GALLERY_DATA.images.length} images from global storage`);
                this.images = [...window.GALLERY_DATA.images];
            } else {
                console.log('⚠️ No images found anywhere, attempting to reload...');
                await this.loadImages();
            }
        }
        
        this.currentFilter = category;
        
        if (!category || category === 'all') {
            console.log(`📄 Showing all ${this.images.length} images`);
            this.renderGallery(this.images);
            this.updateFilterHint(`Showing all ${this.images.length} images`);
            return;
        }

        // Map frontend filter to database category
        const categoryMapping = {
            'marriage': ['marriagestage', 'haldi', 'reception'],
            'marriagestage': 'marriagestage',
            'haldi': 'haldi', 
            'reception': 'reception',
            'birthday': 'birthday',
            'corporate': 'corporate',
            'dhoti': 'dhoti',
            'halfsaree': 'halfsaree',
            'housewarming': 'housewarming',
            'gettogether': 'gettogether'
        };

        let filteredImages = [];

        if (category === 'marriage') {
            // Show marriage subcategories as folders
            console.log('📁 Showing marriage subcategories');
            this.showMarriageSubcategories();
            return;
        } else if (categoryMapping[category]) {
            const dbCategory = categoryMapping[category];
            console.log(`🗂️ Mapping ${category} to database category:`, dbCategory);
            
            if (Array.isArray(dbCategory)) {
                // Multiple categories
                filteredImages = this.images.filter(img => dbCategory.includes(img.category));
                console.log(`📊 Found ${filteredImages.length} images across multiple categories:`, dbCategory);
            } else {
                // Single category - with detailed debugging
                console.log(`🔍 Looking for images with category: "${dbCategory}"`);
                console.log(`📝 Total images to search: ${this.images.length}`);
                
                // Debug: show first few images to see their structure
                if (this.images.length > 0) {
                    console.log('🔬 Sample images:', this.images.slice(0, 3).map(img => ({
                        id: img.id,
                        category: img.category,
                        originalName: img.originalName
                    })));
                }
                
                filteredImages = this.images.filter(img => {
                    const matches = img.category === dbCategory;
                    if (matches) {
                        console.log(`✅ Match found: ${img.originalName} (category: ${img.category})`);
                    }
                    return matches;
                });
                
                console.log(`📊 Found ${filteredImages.length} images in category: ${dbCategory}`);
                
                // Debug: show available categories in our images
                const availableCategories = [...new Set(this.images.map(img => img.category))];
                console.log('🏷️ Available categories in images:', availableCategories);
            }
        } else {
            console.warn(`⚠️ Unknown category: ${category}`);
        }

        this.renderGallery(filteredImages);
        
        const categoryInfo = this.categories.find(cat => cat.id === categoryMapping[category]);
        const categoryName = categoryInfo ? categoryInfo.displayName : category;
        this.updateFilterHint(`Showing ${filteredImages.length} ${categoryName} images`);
    }

    /**
     * Show marriage subcategories as folder view
     */
    showMarriageSubcategories() {
        const folderView = document.getElementById('galleryFolderView');
        const photosWrapper = document.querySelector('.gallery-photos-wrapper');
        
        if (folderView && photosWrapper) {
            folderView.classList.remove('hidden');
            folderView.setAttribute('aria-hidden', 'false');
            photosWrapper.style.display = 'none';
            
            this.updateFilterHint('Choose a marriage category');
        }
    }

    /**
     * Hide marriage subcategories and show photos
     */
    hideMarriageSubcategories() {
        const folderView = document.getElementById('galleryFolderView');
        const photosWrapper = document.querySelector('.gallery-photos-wrapper');
        
        if (folderView && photosWrapper) {
            folderView.classList.add('hidden');
            folderView.setAttribute('aria-hidden', 'true');
            photosWrapper.style.display = 'block';
        }
    }

    /**
     * Render gallery with given images
     */
    renderGallery(imagesToRender = this.images) {
        this.hideMarriageSubcategories();
        
        if (!this.galleryPhotos) {
            console.error('Gallery photos container not found');
            return;
        }

        // Clear existing images
        this.galleryPhotos.innerHTML = '';

        if (imagesToRender.length === 0) {
            console.log('📭 No images to render for current filter');
            this.galleryPhotos.innerHTML = `
                <div class="gallery-empty-state">
                    <p>No images found for this category.</p>
                    <p>Filter: ${this.currentFilter}</p>
                    <button onclick="window.filterGalleryCategory('all')" class="retry-btn">Show All Images</button>
                </div>
            `;
            return;
        }

        // Render images
        imagesToRender.forEach((image, index) => {
            const photoItem = this.createPhotoElement(image, index);
            this.galleryPhotos.appendChild(photoItem);
        });

        // Update loading attributes for performance
        this.updateLoadingAttributes();
    }

    /**
     * Create photo element
     */
    createPhotoElement(image, index) {
        const div = document.createElement('div');
        div.className = 'gallery-photo-item';
        div.setAttribute('data-category', image.category);

        const img = document.createElement('img');
        img.src = image.downloadURL;
        img.alt = image.alt || `${this.getCategoryDisplayName(image.category)} image`;
        img.loading = index < 6 ? 'eager' : 'lazy';
        img.decoding = 'async';
        
        if (index < 6) {
            img.setAttribute('fetchpriority', 'high');
        }

        // Add error handling
        img.onerror = () => {
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zNWVtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
            img.alt = 'Image not found';
        };

        div.appendChild(img);
        return div;
    }

    /**
     * Get category display name
     */
    getCategoryDisplayName(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? category.displayName : categoryId;
    }

    /**
     * Update loading attributes for performance
     */
    updateLoadingAttributes() {
        const images = this.galleryPhotos.querySelectorAll('img');
        images.forEach((img, index) => {
            if (index < 6) {
                img.loading = 'eager';
                img.setAttribute('fetchpriority', 'high');
            } else {
                img.loading = 'lazy';
                img.removeAttribute('fetchpriority');
            }
        });
    }

    /**
     * Update filter hint text
     */
    updateFilterHint(text) {
        if (this.galleryFilterHint) {
            this.galleryFilterHint.textContent = text;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        if (this.galleryPhotos) {
            this.galleryPhotos.innerHTML = `
                <div class="gallery-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading images...</p>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.galleryPhotos) {
            this.galleryPhotos.innerHTML = `
                <div class="gallery-error">
                    <p>${message}</p>
                    <button onclick="window.firebaseGallery.init()" class="retry-btn">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Open lightbox (integrate with existing lightbox functionality)
     */
    openLightbox(imgElement) {
        // This will work with your existing lightbox JavaScript
        const lightbox = document.getElementById('galleryLightbox');
        const lightboxImg = lightbox.querySelector('.gallery-lightbox__img');
        
        if (lightbox && lightboxImg) {
            lightboxImg.src = imgElement.src;
            lightboxImg.alt = imgElement.alt;
            lightbox.setAttribute('aria-hidden', 'false');
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
}

// Global gallery data storage
window.GALLERY_DATA = {
    images: [],
    categories: [],
    instance: null
};

// Global gallery instance
let galleryInstance = null;

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    galleryInstance = new FirebaseGallery();
    window.firebaseGallery = galleryInstance;
    window.GALLERY_DATA.instance = galleryInstance;
    
    // Direct filtering function that works with global data
    window.filterGalleryCategory = (category) => {
        console.log('🌐 Global filter function called with category:', category);
        console.log('🌐 Global images count:', window.GALLERY_DATA.images.length);
        
        const galleryPhotos = document.getElementById('galleryPhotos');
        const galleryFilterHint = document.getElementById('galleryFilterHint');
        
        if (!galleryPhotos) {
            console.error('❌ Gallery photos container not found');
            return;
        }
        
        let imagesToShow = [];
        
        if (category === 'all' || !category) {
            imagesToShow = window.GALLERY_DATA.images;
        } else {
            // Apply the same filtering logic
            const categoryMapping = {
                'marriage': ['marriagestage', 'haldi', 'reception'],
                'marriagestage': 'marriagestage',
                'haldi': 'haldi', 
                'reception': 'reception',
                'birthday': 'birthday'
            };
            
            if (category === 'marriage') {
                // Show marriage subcategories
                const folderView = document.getElementById('galleryFolderView');
                const photosWrapper = document.querySelector('.gallery-photos-wrapper');
                
                if (folderView && photosWrapper) {
                    folderView.classList.remove('hidden');
                    photosWrapper.style.display = 'none';
                }
                return;
            } else if (categoryMapping[category]) {
                const dbCategory = categoryMapping[category];
                imagesToShow = window.GALLERY_DATA.images.filter(img => img.category === dbCategory);
                console.log(`🔍 Direct filtering found ${imagesToShow.length} images for category: ${dbCategory}`);
            }
        }
        
        // Hide folder view and show photos
        const folderView = document.getElementById('galleryFolderView');
        const photosWrapper = document.querySelector('.gallery-photos-wrapper');
        if (folderView && photosWrapper) {
            folderView.classList.add('hidden');
            photosWrapper.style.display = 'block';
        }
        
        // Render images directly
        if (imagesToShow.length === 0) {
            galleryPhotos.innerHTML = `
                <div class="gallery-empty-state">
                    <p>No images found for category: ${category}</p>
                    <button onclick="filterGalleryCategory('all')" class="retry-btn">Show All Images</button>
                </div>
            `;
        } else {
            galleryPhotos.innerHTML = imagesToShow.map(img => `
                <div class="gallery-photo-item" data-category="${img.category}">
                    <img src="${img.downloadURL}" alt="${img.originalName}" loading="lazy" decoding="async">
                </div>
            `).join('');
        }
        
        // Update hint
        if (galleryFilterHint) {
            galleryFilterHint.textContent = `Showing ${imagesToShow.length} images`;
        }
        
        console.log(`✅ Direct filtering completed: ${imagesToShow.length} images displayed`);
    };
});

export default FirebaseGallery;