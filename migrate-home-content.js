#!/usr/bin/env node

const admin = require('firebase-admin');

const DEFAULT_HOMEPAGE_STATS = [
    { value: 8, label: 'Events completed' },
    { value: 8, label: 'Happy clients' },
    { value: 1, label: 'Years experience' }
];

const DEFAULT_TESTIMONIALS = [
    {
        text:
            'For both our engagement and marriage, SAMPRADAYAM EVENTS was outstanding. The convention hall itself wasn\'t ideal, but with new cloth, lighting and decoration they gave the whole venue a fresh, transformed look. The live stalls were run very well—it felt completely stress-free for us. Thank you!',
        authorName: 'Dimpu Duggirala',
        authorRole: 'Engagement & Marriage',
        rating: 5
    },
    {
        text:
            'Our marriage celebration was planned and executed beautifully. SAMPRADAYAM EVENTS managed the stage, decor and schedule seamlessly so we could enjoy every moment with family and guests. Truly thankful!',
        authorName: 'Yalamarthi Thanuja',
        authorRole: 'Marriage',
        rating: 5
    },
    {
        text:
            'Our cradle ceremony was beautiful and stress-free thanks to SAMPRADAYAM EVENTS. They took care of everything with such care. Highly recommended for any celebration!',
        authorName: 'Madhuri Karuturi',
        authorRole: 'Cradle Ceremony',
        rating: 5
    },
    {
        text:
            'The food, decor and grand entry was all good. SAMPRADAYAM EVENTS made our marriage reception truly memorable with excellent arrangements and attention to every detail. Highly satisfied with their service!',
        authorName: 'Bhargav Geda',
        authorRole: 'Marriage Reception',
        rating: 5
    }
];

try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch {
    admin.initializeApp();
}

const db = admin.firestore();
const now = admin.firestore.Timestamp.now();

async function migrateHomeContent({ force = false } = {}) {
    console.log('Migrating homepage stats and testimonials to Firestore...');

    const homepageRef = db.collection('settings').doc('homepage');
    const homepageSnap = await homepageRef.get();
    if (homepageSnap.exists && !force) {
        console.log('settings/homepage already exists — skipping stats (use --force to overwrite).');
    } else {
        await homepageRef.set(
            {
                stats: DEFAULT_HOMEPAGE_STATS,
                updatedAt: now,
                migratedAt: now,
                migratedBy: 'migrate-home-content.js'
            },
            { merge: !force }
        );
        console.log(`Saved ${DEFAULT_HOMEPAGE_STATS.length} hero stats to settings/homepage.`);
    }

    const existing = await db.collection('testimonials').get();
    if (!existing.empty && !force) {
        console.log(`testimonials already has ${existing.size} document(s) — skipping (use --force to replace).`);
        return;
    }

    const batch = db.batch();
    existing.docs.forEach((doc) => batch.delete(doc.ref));

    DEFAULT_TESTIMONIALS.forEach((testimonial, index) => {
        const ref = db.collection('testimonials').doc();
        batch.set(ref, {
            ...testimonial,
            order: index + 1,
            createdAt: now,
            updatedAt: now,
            migratedBy: 'migrate-home-content.js'
        });
    });

    await batch.commit();
    console.log(`Saved ${DEFAULT_TESTIMONIALS.length} testimonials to Firestore.`);
    console.log('Done.');
}

const force = process.argv.includes('--force');

migrateHomeContent({ force })
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
