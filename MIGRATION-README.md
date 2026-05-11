# Gallery Migration - Phase 1

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Enable Firebase Storage:**
   - Go to [Firebase Console](https://console.firebase.google.com) > sampradayam-events project
   - Navigate to Storage > Get started
   - Choose "Start in production mode"

3. **Deploy security rules:**
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

4. **Test migration (5 images only):**
   ```bash
   npm run test-migrate
   ```

5. **If test succeeds, run full migration:**
   ```bash
   npm run migrate
   ```

## What This Migration Does

- ✅ Uploads all 87 images from `public/SampraDayamGallery/` to Firebase Storage
- ✅ Creates Firestore documents with metadata for each image
- ✅ Maps folder structure to categories:
  - `Marriage/MarriageStages` → `marriagestage`
  - `Marriage/Haldi` → `haldi`  
  - `Marriage/Reception` → `reception`
  - `Birthday` → `birthday`
- ✅ Creates gallery category documents
- ✅ Makes all images publicly accessible
- ✅ Preserves original filenames and adds metadata

## After Migration

Your images will be accessible at URLs like:
```
https://storage.googleapis.com/sampradayam-events.appspot.com/gallery/marriagestage/IMG-20251216-WA0039.jpg
```

## Next Steps

After successful migration:
1. Verify images in Firebase Console > Storage
2. Check image documents in Firebase Console > Firestore > galleryImages
3. Ready for Phase 2: Dynamic frontend rendering

## Troubleshooting

- **Authentication Error**: Run `firebase login`
- **Storage Not Found**: Enable Storage in Firebase Console first
- **Permission Denied**: Deploy security rules with `firebase deploy --only storage:rules`