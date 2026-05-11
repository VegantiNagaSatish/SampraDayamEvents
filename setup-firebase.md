# Firebase Setup for Gallery Migration

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Firebase Project Setup

### Option A: Using Firebase CLI (Recommended)
1. Make sure Firebase CLI is installed: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Set the project: `firebase use --add` (select your existing project)

### Option B: Using Service Account (Alternative)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate new private key**
5. Save the JSON file as `firebase-service-account.json` in this directory
6. Update the project ID in `migrate-gallery.js` (line 14 and 19)

## Step 3: Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Storage** > **Get started**
4. Choose **Start in production mode**
5. Select a location (choose same as your Firestore)

## Step 4: Update Project Configuration

1. Find your project ID in Firebase Console
2. Open `migrate-gallery.js` 
3. Replace `'your-project-id.appspot.com'` with your actual project ID

## Step 5: Deploy Security Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Step 6: Test Migration

Run a test with just 5 images first:

```bash
npm run test-migrate
```

If test succeeds, run full migration:

```bash
npm run migrate
```

## Troubleshooting

### Permission Errors
- Make sure you're logged in: `firebase login`
- Verify project selection: `firebase projects:list`

### Storage Bucket Not Found
- Enable Firebase Storage in console first
- Check project ID is correct in script

### Images Not Found
- Verify `public/SampraDayamGallery` folder exists
- Check folder permissions

## After Migration

1. Check Firebase Console > Storage to see uploaded images
2. Check Firebase Console > Firestore to see image documents
3. Verify images are publicly accessible via the URLs

## Project ID Locations to Update

In `migrate-gallery.js`, update these lines with your actual Firebase project ID:
- Line 14: `storageBucket: 'your-project-id.appspot.com'`
- Line 19: `storageBucket: 'your-project-id.appspot.com'`

Your project ID can be found in:
- Firebase Console > Project Settings > General tab
- `.firebaserc` file in your project root