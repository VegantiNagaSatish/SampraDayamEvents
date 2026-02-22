# SampraDayam Events

A modern, responsive website for **SampraDayam Events** — *Every Celebration is Memory* — a premier event management company based in Nallajerla, Andhra Pradesh.

## About

We specialize in creating unforgettable experiences for all your special occasions. From intimate gatherings to grand celebrations, we bring your vision to life with meticulous planning and execution.

## Location

**Address:** Sri Hanuman Enterprises, Nallajerla, Andhra Pradesh 534152

## Services

- Wedding Celebrations (Marriage Stage & Haldi)
- Birthday Parties
- Catering Services
- Get Together Events
- Photography & Videography
- Corporate Events
- Dhoti Ceremony
- Half Saree Ceremony
- Lighting and Sound
- House Warming Ceremony

## Contact

- **Phone:** 83091 33572 · 79974 49444  
- **Email:** sampradayam.events393@gmail.com  
- **Instagram:** [@_sampradayam_events](https://www.instagram.com/_sampradayam_events?igsh=bGJwbXo4bXJtMGho)  
- **WhatsApp:** [83091 33572](https://wa.me/918309133572)

---

## Project Structure

```
SampraDayamEvents/
├── public/                      # Site source (Firebase hosting root)
│   ├── index.html              # Home
│   ├── about.html              # About
│   ├── services.html           # Services
│   ├── gallery.html            # Gallery with category filters
│   ├── contact.html            # Contact
│   ├── styles.css              # Main stylesheet
│   ├── script.js               # Navigation, gallery filters, lightbox, contact
│   ├── sdLogo.jpeg             # Logo (favicon & nav)
│   ├── sdLogoBlack.jpeg        # Logo variant
│   └── SampraDayamGallery/     # Gallery images
│       ├── Marriage/
│       │   ├── MarriageStages/ # Marriage stage photos
│       │   └── Haldi/          # Haldi ceremony photos
│       └── Birthday/           # Birthday event photos
├── firebase.json               # Firebase Hosting config (public dir)
├── .firebaserc                 # Firebase project
├── .gitignore
└── README.md
```

## Tech Stack

- **HTML5** — Semantic markup  
- **CSS3** — Custom properties, Flexbox, Grid, transitions  
- **Vanilla JavaScript** — Gallery filters, lightbox, mobile menu, contact (WhatsApp)  
- **Firebase Hosting** — Deploy target  
- **Google Fonts** — Poppins, Playfair Display  

## Local Development

Serve the `public` folder:

```bash
cd public
python3 -m http.server 8000
```

Then open **http://localhost:8000** (or http://[::]:8000).

Optional (Node):

```bash
npx http-server public -p 8000
```

## Deployment (Firebase)

1. Install CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Deploy: `firebase deploy --only hosting`

Hosting is configured to use the `public` directory.

## Website Features

- **Responsive layout** — Mobile-first, works on all devices  
- **Gallery** — Category filters: Marriage (Marriage Stage, Haldi), Birthday, Corporate, Dhoti Ceremony, Half Saree, House Warming, Get Together  
- **Lightbox** — Full-size image view from gallery  
- **Contact** — Form opens WhatsApp with pre-filled message  
- **Maps** — Embedded Google Map for location  
- **Favicon** — Site logo in browser tab  
- **Dark theme** — Black backgrounds for header, gallery, and page headers  

## Pages

| Page        | Path           | Description                    |
|------------|----------------|--------------------------------|
| Home       | `index.html`   | Hero, services, stats, preview |
| Services   | `services.html`| Service details                |
| Gallery    | `gallery.html` | Filterable photo gallery       |
| About      | `about.html`   | Company story                  |
| Contact    | `contact.html` | Form, map, contact info        |

## License

Proprietary — SampraDayam Events.

---

**Every Celebration is Memory**
