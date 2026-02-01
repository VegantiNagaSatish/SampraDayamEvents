// Mobile Menu Toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        });
    });
}

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
            navbar.style.background = 'rgba(15, 19, 40, 0.98)';
        } else {
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            navbar.style.background = 'rgba(15, 19, 40, 0.95)';
        }
    }
});

// Stats Counter Animation
function animateCounter(element, target, duration = 2000) {
    // If target is 0, set it directly without animation
    if (target === 0) {
        element.textContent = 0;
        return;
    }
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

// Intersection Observer for stats counter
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumber = entry.target;
            const target = parseInt(statNumber.getAttribute('data-target'));
            if (!statNumber.classList.contains('counted')) {
                statNumber.classList.add('counted');
                animateCounter(statNumber, target);
            }
        }
    });
}, { threshold: 0.5 });

// Observe all stat numbers
document.addEventListener('DOMContentLoaded', () => {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        statsObserver.observe(stat);
    });
});

// Contact Form Handler
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const eventType = formData.get('eventType');
        const location = formData.get('location');
        const message = formData.get('message') || '';
        
        // Create WhatsApp message
        const whatsappMessage = `Hello SAMPRADAYAM EVENTS!%0A%0A` +
            `Name: ${encodeURIComponent(name)}%0A` +
            `Event Type: ${encodeURIComponent(eventType)}%0A` +
            `Location: ${encodeURIComponent(location)}%0A` +
            (message ? `Additional Details: ${encodeURIComponent(message)}%0A` : '');
        
        // WhatsApp number (using the first phone number)
        const phoneNumber = '8309133572';
        const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${whatsappMessage}`;
        
        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
        
        // Reset form
        contactForm.reset();
        
        // Show success message (optional)
        alert('Opening WhatsApp to contact us!');
    });
}

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe service cards, feature cards, and gallery items
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.service-card, .feature-card, .gallery-item, .gallery-photo-item, .testimonial-card, .service-card-large');
    
    animatedElements.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(item);
    });

    // Gallery filter: when clicking Wedding (or All), show/hide photos by category
    const filterBtns = document.querySelectorAll('.gallery-filter-btn');
    const photoItems = document.querySelectorAll('.gallery-photo-item');
    const hintEl = document.getElementById('galleryFilterHint');

    // Add "View full size" label to each gallery item for hover
    photoItems.forEach(item => {
        if (!item.querySelector('.gallery-photo-item__view')) {
            const viewLabel = document.createElement('span');
            viewLabel.className = 'gallery-photo-item__view';
            viewLabel.textContent = 'View full size';
            item.appendChild(viewLabel);
        }
    });

    if (filterBtns.length && photoItems.length) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.getAttribute('data-filter');

                photoItems.forEach(item => {
                    const category = item.getAttribute('data-category');
                    const show = filter === 'all' || category === filter;
                    item.classList.toggle('hidden', !show);
                });

                if (hintEl) {
                    if (filter === 'wedding') hintEl.textContent = 'Showing wedding & marriage stage photos.';
                    else if (filter === 'birthday') hintEl.textContent = 'Showing birthday photos.';
                    else if (filter === 'all') hintEl.textContent = 'Showing all photos.';
                    else hintEl.textContent = 'No photos in this category yet.';
                }
            });
        });
    }

    // Gallery lightbox: click photo to view full size
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImg = document.querySelector('.gallery-lightbox__img');
    const lightboxOverlay = document.querySelector('.gallery-lightbox__overlay');
    const lightboxClose = document.querySelector('.gallery-lightbox__close');

    function openLightbox(src, alt) {
        if (!lightbox || !lightboxImg) return;
        lightboxImg.src = src;
        lightboxImg.alt = alt || 'Gallery photo';
        lightbox.setAttribute('aria-hidden', 'false');
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (photoItems.length && lightbox) {
        photoItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const img = item.querySelector('img');
                if (img && img.src) {
                    e.preventDefault();
                    openLightbox(img.src, img.alt);
                }
            });
        });
        if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);
        if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
        });
    }

    // Fade in gallery images when loaded (smoother perceived loading)
    document.querySelectorAll('.gallery-photo-item img').forEach(function (img) {
        if (img.complete) img.classList.add('gallery-img-loaded');
        else img.addEventListener('load', function () { img.classList.add('gallery-img-loaded'); });
    });
});

// Smooth scroll for anchor links (if any)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offsetTop = target.offsetTop - 70;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    });
});
