# SampraDayam Events

A modern, responsive website for SampraDayam Events, a premier event management company based in Nallajerla, Andhra Pradesh.

## About

**SampraDayam Events** - *Every Celebration is Memory*

We specialize in creating unforgettable experiences for all your special occasions. From intimate gatherings to grand celebrations, we bring your vision to life with meticulous planning and execution.

## Location

**Address:** Sri Hanuman Enterprises, Nallajerla, Andhra Pradesh 534152

## Services

We offer comprehensive event management services including:

- Wedding Celebrations
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

**Phone:**
- 83091 33572
- 79974 49444

**Email:**
- sampradayam.events393@gmail.com

**Social Media:**
- Instagram: [@_sampradayam_events](https://www.instagram.com/_sampradayam_events?igsh=bGJwbXo4bXJtMGho)
- WhatsApp: [83091 33572](https://wa.me/918309133572)

## Website Features

- **Responsive Design:** Fully responsive website that works seamlessly on all devices (desktop, tablet, mobile)
- **Modern UI/UX:** Clean, elegant design with smooth animations and transitions
- **Interactive Gallery:** Showcase of past events and celebrations
- **Contact Form:** Easy-to-use contact form with WhatsApp integration
- **Google Maps Integration:** Interactive map showing business location
- **Service Showcase:** Detailed information about all services offered
- **About Section:** Company story and values
- **Statistics Counter:** Animated statistics display
- **Smooth Scrolling:** Enhanced user experience with smooth page navigation

## Project Structure

```
SampraDayamEvents/
├── public/                 # Main website files (deployed to Firebase)
│   ├── index.html         # Home page
│   ├── about.html         # About page
│   ├── services.html      # Services page
│   ├── gallery.html       # Gallery page
│   ├── contact.html       # Contact page
│   ├── styles.css         # Main stylesheet
│   ├── script.js          # JavaScript functionality
│   ├── sdLogo.jpeg        # Logo (light version)
│   └── sdLogoBlack.jpeg   # Logo (dark version)
├── firebase.json          # Firebase hosting configuration
├── .firebaserc            # Firebase project configuration
└── README.md              # This file
```

## Technology Stack

- **HTML5:** Semantic markup
- **CSS3:** Modern styling with Flexbox and Grid
- **JavaScript (Vanilla):** Interactive features and animations
- **Firebase Hosting:** Website deployment and hosting
- **Google Fonts:** Poppins and Playfair Display fonts
- **Google Maps API:** Location embedding

## Local Development

To run the website locally:

1. **Using Python (Simple HTTP Server):**
   ```bash
   cd public
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

2. **Using Node.js (http-server):**
   ```bash
   npm install -g http-server
   cd public
   http-server -p 8000
   ```

## Deployment

The website is deployed on **Firebase Hosting**.

### Deploy to Firebase

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Deploy:**
   ```bash
   firebase deploy --only hosting
   ```

### Firebase Configuration

- **Project ID:** sampradayam-events
- **Public Directory:** `public`
- **Hosting URL:** Available after deployment

## Pages

1. **Home (`index.html`):** Hero section, features, services showcase, statistics
2. **Services (`services.html`):** Detailed service offerings
3. **Gallery (`gallery.html`):** Portfolio of past events
4. **About (`about.html`):** Company information and story
5. **Contact (`contact.html`):** Contact form, location map, contact details

## Features Implemented

- ✅ Responsive navigation with mobile menu
- ✅ Animated statistics counter
- ✅ Smooth scroll animations
- ✅ Contact form with WhatsApp integration
- ✅ Google Maps location embed
- ✅ Social media links (Instagram, WhatsApp)
- ✅ Footer with contact information and quick links
- ✅ Modern, clean UI design
- ✅ Mobile-first responsive design

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is proprietary and belongs to SampraDayam Events.

## Credits

Developed for SampraDayam Events - Creating magical moments and unforgettable experiences.

---

**Every Celebration is Memory** ✨
