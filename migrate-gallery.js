#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');

// Initialize Firebase Admin SDK
// Make sure you have your service account key file or use Application Default Credentials
try {
  // Try to initialize with service account key if it exists
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'sampradayam-events.firebasestorage.app'
  });
} catch (error) {
  console.log('Service account file not found, trying with default credentials...');
  // Fallback to default credentials (works if you're logged in with Firebase CLI)
  admin.initializeApp({
    storageBucket: 'sampradayam-events.firebasestorage.app'
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Category mapping from folder structure to database categories
const CATEGORY_MAPPING = {
  'Marriage/MarriageStages': 'marriagestage',
  'Marriage/Haldi': 'haldi',
  'Marriage/Reception': 'reception',
  'Birthday': 'birthday',
  'Gallery': 'general' // Fallback category
};

// Category display information
const CATEGORY_INFO = {
  'marriagestage': {
    name: 'Marriage Stage',
    displayName: 'Marriage Stage',
    description: 'Wedding ceremony moments',
    sortOrder: 1
  },
  'haldi': {
    name: 'Haldi',
    displayName: 'Haldi',
    description: 'Haldi ceremony celebrations',
    sortOrder: 2
  },
  'reception': {
    name: 'Reception',
    displayName: 'Reception',
    description: 'Wedding reception events',
    sortOrder: 3
  },
  'birthday': {
    name: 'Birthday',
    displayName: 'Birthday',
    description: 'Birthday celebrations',
    sortOrder: 4
  },
  'general': {
    name: 'General',
    displayName: 'General',
    description: 'General gallery images',
    sortOrder: 5
  }
};

async function scanGalleryFolder(basePath = './public/SampraDayamGallery') {
  const images = [];
  
  async function scanDirectory(dirPath, relativePath = '') {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const itemRelativePath = path.join(relativePath, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await scanDirectory(fullPath, itemRelativePath);
        } else if (stat.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
          // Determine category from path
          let category = 'general';
          for (const [folderPath, categoryId] of Object.entries(CATEGORY_MAPPING)) {
            if (itemRelativePath.startsWith(folderPath)) {
              category = categoryId;
              break;
            }
          }
          
          images.push({
            fileName: item,
            fullPath: fullPath,
            relativePath: itemRelativePath,
            category: category,
            size: stat.size,
            lastModified: stat.mtime
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error.message);
    }
  }
  
  await scanDirectory(basePath);
  return images;
}

async function uploadImageToStorage(imagePath, fileName, category) {
  try {
    const fileBuffer = await fs.readFile(imagePath);
    const mimeType = mime.lookup(fileName) || 'image/jpeg';
    
    // Create storage path: gallery/category/filename
    const storagePath = `gallery/${category}/${fileName}`;
    const file = bucket.file(storagePath);
    
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalPath: imagePath,
          uploadedAt: new Date().toISOString(),
          category: category
        }
      }
    });
    
    // Make file publicly readable
    await file.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    
    console.log(`✅ Uploaded: ${fileName} → ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`❌ Failed to upload ${fileName}:`, error.message);
    throw error;
  }
}

async function createImageDocument(imageData, imageUrl) {
  try {
    const docData = {
      filename: imageData.fileName,
      originalName: imageData.fileName,
      category: imageData.category,
      subcategory: path.dirname(imageData.relativePath).split('/').pop() || '',
      title: generateTitle(imageData.fileName, imageData.category),
      description: generateDescription(imageData.category),
      altText: generateAltText(imageData.fileName, imageData.category),
      imageUrl: imageUrl,
      uploadedAt: admin.firestore.Timestamp.now(),
      uploadedBy: 'migration-script',
      isActive: true,
      sortOrder: 0, // Will be updated later if needed
      tags: generateTags(imageData.category),
      metadata: {
        originalSize: imageData.size,
        fileType: mime.lookup(imageData.fileName) || 'image/jpeg',
        originalPath: imageData.relativePath,
        migratedAt: admin.firestore.Timestamp.now()
      }
    };
    
    const docRef = await db.collection('galleryImages').add(docData);
    console.log(`📝 Created document: ${docRef.id} for ${imageData.fileName}`);
    return docRef.id;
  } catch (error) {
    console.error(`❌ Failed to create document for ${imageData.fileName}:`, error.message);
    throw error;
  }
}

async function createCategoryDocuments() {
  console.log('🏗️  Creating category documents...');
  
  for (const [categoryId, categoryInfo] of Object.entries(CATEGORY_INFO)) {
    try {
      const categoryDoc = {
        id: categoryId,
        ...categoryInfo,
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        createdBy: 'migration-script'
      };
      
      await db.collection('galleryCategories').doc(categoryId).set(categoryDoc);
      console.log(`✅ Created category: ${categoryInfo.displayName}`);
    } catch (error) {
      console.error(`❌ Failed to create category ${categoryId}:`, error.message);
    }
  }
}

function generateTitle(filename, category) {
  const categoryTitles = {
    'marriagestage': 'Wedding Ceremony',
    'haldi': 'Haldi Celebration',
    'reception': 'Wedding Reception',
    'birthday': 'Birthday Celebration',
    'general': 'Gallery Image'
  };
  
  return categoryTitles[category] || 'Event Photo';
}

function generateDescription(category) {
  const categoryDescriptions = {
    'marriagestage': 'Beautiful moments from the wedding ceremony',
    'haldi': 'Joyful haldi ceremony celebrations',
    'reception': 'Memorable wedding reception moments',
    'birthday': 'Birthday party celebrations',
    'general': 'Special event moments'
  };
  
  return categoryDescriptions[category] || 'A memorable moment from our events';
}

function generateAltText(filename, category) {
  const categoryAltText = {
    'marriagestage': 'Wedding ceremony photo',
    'haldi': 'Haldi ceremony celebration',
    'reception': 'Wedding reception photo',
    'birthday': 'Birthday celebration photo',
    'general': 'Event photo'
  };
  
  return categoryAltText[category] || 'Event photography';
}

function generateTags(category) {
  const categoryTags = {
    'marriagestage': ['wedding', 'ceremony', 'marriage', 'mandap'],
    'haldi': ['haldi', 'wedding', 'celebration', 'traditional'],
    'reception': ['reception', 'wedding', 'party', 'celebration'],
    'birthday': ['birthday', 'party', 'celebration'],
    'general': ['event', 'celebration']
  };
  
  return categoryTags[category] || ['event'];
}

async function migrateImages(testMode = false) {
  console.log('🚀 Starting gallery migration...');
  console.log(`Mode: ${testMode ? 'TEST (first 5 images only)' : 'FULL MIGRATION'}`);
  
  try {
    // Create category documents first
    await createCategoryDocuments();
    
    // Scan for images
    console.log('📁 Scanning gallery folder...');
    const images = await scanGalleryFolder();
    console.log(`Found ${images.length} images`);
    
    if (images.length === 0) {
      console.log('⚠️  No images found in public/SampraDayamGallery folder');
      return;
    }
    
    // Limit to 5 images in test mode
    const imagesToProcess = testMode ? images.slice(0, 5) : images;
    console.log(`Processing ${imagesToProcess.length} images...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const [index, imageData] of imagesToProcess.entries()) {
      console.log(`\n[${index + 1}/${imagesToProcess.length}] Processing: ${imageData.fileName}`);
      console.log(`  Category: ${imageData.category}`);
      console.log(`  Path: ${imageData.relativePath}`);
      
      try {
        // Upload to Firebase Storage
        const imageUrl = await uploadImageToStorage(
          imageData.fullPath,
          imageData.fileName,
          imageData.category
        );
        
        // Create Firestore document
        await createImageDocument(imageData, imageUrl);
        
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to process ${imageData.fileName}:`, error.message);
        failCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Total images found: ${images.length}`);
    
    if (testMode && successCount > 0) {
      console.log('\n🧪 Test migration completed successfully!');
      console.log('💡 Run "npm run migrate" for full migration');
    } else if (!testMode) {
      console.log('\n🎉 Full migration completed!');
      console.log('🔍 Check Firebase Console to verify uploads');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// CLI handling
const args = process.argv.slice(2);
const testMode = args.includes('--test');

// Check if we're in test mode or full migration
migrateImages(testMode)
  .then(() => {
    console.log('🏁 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });