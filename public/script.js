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

    // Home gallery videos: play intro1 then intro2, then loop back to intro1
    const homeIntro1 = document.getElementById('homeGalleryIntro1');
    const homeIntro2 = document.getElementById('homeGalleryIntro2');
    if (homeIntro1 && homeIntro2) {
        homeIntro1.classList.add('is-active');
        homeIntro1.addEventListener('ended', () => {
            homeIntro1.classList.remove('is-active');
            homeIntro2.currentTime = 0;
            homeIntro2.classList.add('is-active');
            homeIntro2.play();
        });
        homeIntro2.addEventListener('ended', () => {
            homeIntro2.classList.remove('is-active');
            homeIntro1.currentTime = 0;
            homeIntro1.classList.add('is-active');
            homeIntro1.play();
        });
    }
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
    const animatedSelectors = '.service-card, .feature-card, .gallery-item, .testimonial-card, .service-card-large';
    const galleryPhotoItems = document.querySelectorAll('.gallery-photo-item');
    const otherAnimated = document.querySelectorAll(animatedSelectors);

    // Other elements: keep staggered animation
    otherAnimated.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(item);
    });

    // Gallery photos: use a small capped delay so grid images appear quickly when in view (not 8–20s)
    galleryPhotoItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        const delay = Math.min(index * 0.03, 0.35);
        item.style.transition = `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`;
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

    var folderView = document.getElementById('galleryFolderView');
    var galleryPhotosGrid = document.getElementById('galleryPhotos');
    var marriageBtn = document.getElementById('galleryFilterMarriage');
    var folderCards = document.querySelectorAll('.gallery-folder-card');
    var allFilterBtns = document.querySelectorAll('.gallery-filter-btn[data-filter]');

    // Preload all gallery images so every folder opens fast. Interleave by category so
    // Marriage doesn't hog the queue—each folder gets equal priority (round-robin).
    (function preloadAllGalleryImages() {
        if (!photoItems.length) return;
        var byCategory = {};
        photoItems.forEach(function (item) {
            var cat = item.getAttribute('data-category') || 'other';
            if (!byCategory[cat]) byCategory[cat] = [];
            var img = item.querySelector('img');
            if (img && img.src) byCategory[cat].push(img.src);
        });
        var categories = Object.keys(byCategory);
        var maxLen = 0;
        categories.forEach(function (c) { if (byCategory[c].length > maxLen) maxLen = byCategory[c].length; });
        var interleaved = [];
        for (var i = 0; i < maxLen; i++) {
            categories.forEach(function (c) {
                if (byCategory[c][i]) interleaved.push(byCategory[c][i]);
            });
        }
        function runPreload() {
            interleaved.forEach(function (src) {
                var preload = new Image();
                preload.src = src;
            });
        }
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(runPreload, { timeout: 1000 });
        } else {
            setTimeout(runPreload, 400);
        }
    })();

    function showNoSelection() {
        if (folderView) folderView.classList.add('hidden');
        if (galleryPhotosGrid) galleryPhotosGrid.classList.remove('hidden');
        photoItems.forEach(function (item) { item.classList.add('hidden'); });
        if (hintEl) hintEl.textContent = 'Select a category to view photos.';
        allFilterBtns.forEach(function (b) { b.classList.remove('active'); });
    }

    function showMarriageFolders() {
        if (folderView) {
            folderView.classList.remove('hidden');
            folderView.setAttribute('aria-hidden', 'false');
        }
        if (galleryPhotosGrid) galleryPhotosGrid.classList.add('hidden');
        if (hintEl) hintEl.textContent = 'Choose a folder';
        if (marriageBtn) marriageBtn.classList.add('active');
        allFilterBtns.forEach(function (b) {
            if (b !== marriageBtn) b.classList.remove('active');
        });
    }

    function showPhotoGrid() {
        if (folderView) {
            folderView.classList.add('hidden');
            folderView.setAttribute('aria-hidden', 'true');
        }
        if (galleryPhotosGrid) galleryPhotosGrid.classList.remove('hidden');
    }

    function applyGalleryFilter(filter) {
        if (!filter || filter === 'marriage' || !photoItems.length) return;
        showPhotoGrid();
        photoItems.forEach(item => {
            const category = item.getAttribute('data-category');
            const show = category === filter;
            item.classList.toggle('hidden', !show);
        });
        if (hintEl) {
            if (filter === 'marriagestage') hintEl.textContent = 'Showing Marriage Stage photos.';
            else if (filter === 'haldi') hintEl.textContent = 'Showing Haldi ceremony photos.';
            else if (filter === 'reception') hintEl.textContent = 'Showing Reception photos.';
            else if (filter === 'birthday') hintEl.textContent = 'Showing birthday photos.';
            else hintEl.textContent = 'No photos in this category yet.';
        }
    }

    function setActiveFilter(filter) {
        if (!filter || filter === 'marriage') return;
        if (filter === 'marriagestage' || filter === 'haldi' || filter === 'reception') {
            if (marriageBtn) marriageBtn.classList.add('active');
            allFilterBtns.forEach(function (b) {
                b.classList.toggle('active', b === marriageBtn);
            });
        } else {
            if (marriageBtn) marriageBtn.classList.remove('active');
            allFilterBtns.forEach(function (b) {
                b.classList.toggle('active', b.getAttribute('data-filter') === filter);
            });
        }
    }

    if (marriageBtn) {
        marriageBtn.addEventListener('click', function () {
            showMarriageFolders();
        });
    }
    folderCards.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var filter = btn.getAttribute('data-filter');
            applyGalleryFilter(filter);
            setActiveFilter(filter);
        });
    });
    allFilterBtns.forEach(function (btn) {
        if (btn === marriageBtn) return;
        btn.addEventListener('click', function () {
            var filter = btn.getAttribute('data-filter');
            applyGalleryFilter(filter);
            setActiveFilter(filter);
        });
    });

    showMarriageFolders();

    // Gallery lightbox: click photo to view full size; prev/next among visible (filtered) images
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImg = document.querySelector('.gallery-lightbox__img');
    const lightboxOverlay = document.querySelector('.gallery-lightbox__overlay');
    const lightboxClose = document.querySelector('.gallery-lightbox__close');
    const lightboxPrev = document.getElementById('galleryLightboxPrev');
    const lightboxNext = document.getElementById('galleryLightboxNext');

    var lightboxIndex = 0;

    function getVisibleGalleryItems() {
        return Array.prototype.slice.call(document.querySelectorAll('.gallery-photo-item')).filter(function (el) {
            return !el.classList.contains('hidden');
        });
    }

    function updateLightboxNav(count) {
        var show = count > 1;
        if (lightboxPrev) {
            lightboxPrev.hidden = !show;
            lightboxPrev.setAttribute('aria-hidden', show ? 'false' : 'true');
        }
        if (lightboxNext) {
            lightboxNext.hidden = !show;
            lightboxNext.setAttribute('aria-hidden', show ? 'false' : 'true');
        }
    }

    function showLightboxAt(index) {
        if (!lightbox || !lightboxImg) return;
        var items = getVisibleGalleryItems();
        if (!items.length) return;
        var len = items.length;
        var i = index % len;
        if (i < 0) i += len;
        lightboxIndex = i;
        var img = items[i].querySelector('img');
        if (!img || !img.src) return;
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || 'Gallery photo';
        lightbox.setAttribute('aria-hidden', 'false');
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        updateLightboxNav(len);
    }

    function stepLightbox(delta) {
        if (!lightbox || !lightbox.classList.contains('is-open')) return;
        var items = getVisibleGalleryItems();
        if (items.length <= 1) return;
        showLightboxAt(lightboxIndex + delta);
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (photoItems.length && lightbox) {
        photoItems.forEach(function (item) {
            item.addEventListener('click', function (e) {
                var img = item.querySelector('img');
                if (img && img.src) {
                    e.preventDefault();
                    var items = getVisibleGalleryItems();
                    var idx = items.indexOf(item);
                    if (idx === -1) return;
                    showLightboxAt(idx);
                }
            });
        });
        if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);
        if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
        if (lightboxPrev) {
            lightboxPrev.addEventListener('click', function (e) {
                e.stopPropagation();
                stepLightbox(-1);
            });
        }
        if (lightboxNext) {
            lightboxNext.addEventListener('click', function (e) {
                e.stopPropagation();
                stepLightbox(1);
            });
        }
        document.addEventListener('keydown', function (e) {
            if (!lightbox || !lightbox.classList.contains('is-open')) return;
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                stepLightbox(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                stepLightbox(1);
            }
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
