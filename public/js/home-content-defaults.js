/** Default homepage stats and reviews (used when Firestore is empty or unavailable). */
export const DEFAULT_HOMEPAGE_STATS = [
    { value: 8, label: 'Events completed' },
    { value: 8, label: 'Happy clients' },
    { value: 1, label: 'Years experience' }
];

export const DEFAULT_TESTIMONIALS = [
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
