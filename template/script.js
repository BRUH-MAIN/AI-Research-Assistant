// Professional Presentation Template JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize presentation
    initializePresentation();
    
    // Setup navigation
    setupNavigation();
    
    // Setup animations
    setupAnimations();
    
    // Setup keyboard navigation
    setupKeyboardNavigation();
    
    // Setup progress tracking
    setupProgressTracking();
    
    // Setup touch navigation
    setupTouchNavigation();
    
    // Initialize slide indicator
    updateProgress();
    
    // Setup smooth scrolling
    setupSmoothScrolling();
});

// Initialize presentation functionality
function initializePresentation() {
    console.log('AI Research Assistant - Professional Presentation Template Loaded');
    
    // Update current slide on page load
    updateCurrentSlide();
    
    // Set initial progress
    updateProgress();
    
    // Setup navigation overflow handling
    setupNavigationOverflow();
    
    // Add loading animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease-in-out';
        document.body.style.opacity = '1';
    }, 100);
}

// Setup navigation overflow handling
function setupNavigationOverflow() {
    const navbar = document.querySelector('.navbar-nav');
    if (!navbar) return;
    
    function checkOverflow() {
        const isOverflowing = navbar.scrollWidth > navbar.clientWidth;
        const wrapper = navbar.parentElement;
        
        if (isOverflowing) {
            wrapper.classList.add('scrollable');
        } else {
            wrapper.classList.remove('scrollable');
        }
    }
    
    // Check on load and resize
    checkOverflow();
    window.addEventListener('resize', debounce(checkOverflow, 250));
    
    // Smooth scroll for navigation overflow
    if (navbar.scrollWidth > navbar.clientWidth) {
        navbar.style.cursor = 'grab';
        
        let isDown = false;
        let startX;
        let scrollLeft;
        
        navbar.addEventListener('mousedown', (e) => {
            isDown = true;
            navbar.style.cursor = 'grabbing';
            startX = e.pageX - navbar.offsetLeft;
            scrollLeft = navbar.scrollLeft;
        });
        
        navbar.addEventListener('mouseleave', () => {
            isDown = false;
            navbar.style.cursor = 'grab';
        });
        
        navbar.addEventListener('mouseup', () => {
            isDown = false;
            navbar.style.cursor = 'grab';
        });
        
        navbar.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - navbar.offsetLeft;
            const walk = (x - startX) * 2;
            navbar.scrollLeft = scrollLeft - walk;
        });
    }
}

// Setup navigation functionality
function setupNavigation() {
    const slides = document.querySelectorAll('.slide');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    
    let currentSlideIndex = 0;
    
    // Navigation button functionality
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentSlideIndex > 0) {
                currentSlideIndex--;
                navigateToSlide(currentSlideIndex);
            }
        });
        
        nextBtn.addEventListener('click', () => {
            if (currentSlideIndex < slides.length - 1) {
                currentSlideIndex++;
                navigateToSlide(currentSlideIndex);
            }
        });
    }
    
    // Update navigation buttons state
    function updateNavigationButtons() {
        if (prevBtn && nextBtn) {
            prevBtn.disabled = currentSlideIndex === 0;
            nextBtn.disabled = currentSlideIndex === slides.length - 1;
            
            // Add visual feedback for disabled state
            prevBtn.style.opacity = currentSlideIndex === 0 ? '0.5' : '1';
            nextBtn.style.opacity = currentSlideIndex === slides.length - 1 ? '0.5' : '1';
        }
    }
    
    // Navigate to specific slide
    function navigateToSlide(index) {
        const targetSlide = slides[index];
        if (targetSlide) {
            targetSlide.scrollIntoView({ behavior: 'smooth' });
            currentSlideIndex = index;
            updateNavigationButtons();
            updateProgress();
            updateActiveNavLink();
        }
    }
    
    // Update active navigation link
    function updateActiveNavLink() {
        navLinks.forEach((link, index) => {
            link.classList.toggle('active', index === currentSlideIndex);
        });
        
        // Scroll active link into view on mobile
        const activeLink = document.querySelector('.navbar-nav .nav-link.active');
        if (activeLink && window.innerWidth <= 992) {
            const navbar = document.querySelector('.navbar-nav');
            const linkRect = activeLink.getBoundingClientRect();
            const navbarRect = navbar.getBoundingClientRect();
            
            if (linkRect.left < navbarRect.left || linkRect.right > navbarRect.right) {
                activeLink.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest'
                });
            }
        }
    }
    
    // Smooth scrolling for navigation links
    navLinks.forEach((link, index) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            currentSlideIndex = index;
            navigateToSlide(index);
        });
    });
    
    // Track scroll position to update current slide
    let isScrolling = false;
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            isScrolling = true;
            setTimeout(() => {
                updateCurrentSlideOnScroll();
                isScrolling = false;
            }, 100);
        }
    });
    
    function updateCurrentSlideOnScroll() {
        const scrollPosition = window.scrollY + window.innerHeight / 2;
        
        slides.forEach((slide, index) => {
            const slideTop = slide.offsetTop;
            const slideBottom = slideTop + slide.offsetHeight;
            
            if (scrollPosition >= slideTop && scrollPosition <= slideBottom) {
                if (currentSlideIndex !== index) {
                    currentSlideIndex = index;
                    updateNavigationButtons();
                    updateProgress();
                    updateActiveNavLink();
                }
            }
        });
    }
    
    // Initial setup
    updateNavigationButtons();
}

// Setup scroll-triggered animations
function setupAnimations() {
    const animatedElements = document.querySelectorAll(
        '.fade-in, .fade-in-delay, .fade-in-delay-2, .fade-in-delay-3, .fade-in-delay-4, ' +
        '.slide-in-left, .slide-in-left-delay, .slide-in-left-delay-2, .slide-in-right'
    );
    
    // Create intersection observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.visibility = 'visible';
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, observerOptions);
    
    // Initially hide animated elements
    animatedElements.forEach(element => {
        element.style.visibility = 'hidden';
        element.style.animationPlayState = 'paused';
        observer.observe(element);
    });
}

// Setup keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        const slides = document.querySelectorAll('.slide');
        const currentSlide = getCurrentSlideIndex();
        
        switch(e.key) {
            case 'ArrowDown':
            case 'ArrowRight':
            case ' ': // Spacebar
                e.preventDefault();
                if (currentSlide < slides.length - 1) {
                    navigateToSlideByIndex(currentSlide + 1);
                }
                break;
                
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                if (currentSlide > 0) {
                    navigateToSlideByIndex(currentSlide - 1);
                }
                break;
                
            case 'Home':
                e.preventDefault();
                navigateToSlideByIndex(0);
                break;
                
            case 'End':
                e.preventDefault();
                navigateToSlideByIndex(slides.length - 1);
                break;
                
            case 'Escape':
                // Exit fullscreen if supported
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
                
            case 'F11':
                // Toggle fullscreen
                e.preventDefault();
                toggleFullscreen();
                break;
        }
    });
}

// Get current slide index
function getCurrentSlideIndex() {
    const slides = document.querySelectorAll('.slide');
    const scrollPosition = window.scrollY + window.innerHeight / 2;
    
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slideTop = slide.offsetTop;
        const slideBottom = slideTop + slide.offsetHeight;
        
        if (scrollPosition >= slideTop && scrollPosition <= slideBottom) {
            return i;
        }
    }
    return 0;
}

// Navigate to slide by index
function navigateToSlideByIndex(index) {
    const slides = document.querySelectorAll('.slide');
    if (slides[index]) {
        slides[index].scrollIntoView({ behavior: 'smooth' });
    }
}

// Toggle fullscreen mode
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Setup progress tracking
function setupProgressTracking() {
    window.addEventListener('scroll', updateProgress);
}

// Update progress bar and slide indicator
function updateProgress() {
    const slides = document.querySelectorAll('.slide');
    const currentSlide = getCurrentSlideIndex();
    const progress = ((currentSlide + 1) / slides.length) * 100;
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    
    // Update slide indicator
    const currentSlideNumber = document.getElementById('currentSlideNumber');
    const totalSlides = document.getElementById('totalSlides');
    
    if (currentSlideNumber && totalSlides) {
        currentSlideNumber.textContent = currentSlide + 1;
        totalSlides.textContent = slides.length;
    }
}

// Update current slide indicator
function updateCurrentSlide() {
    const hash = window.location.hash;
    if (hash) {
        const targetElement = document.querySelector(hash);
        if (targetElement) {
            setTimeout(() => {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }
}

// Utility function to add smooth scroll behavior to all internal links
function setupSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update URL without jumping
                history.pushState(null, null, targetId);
            }
        });
    });
}

// Initialize smooth scrolling
setupSmoothScrolling();

// Add touch/swipe support for mobile devices
function setupTouchNavigation() {
    let startY = 0;
    let startX = 0;
    const minSwipeDistance = 50;
    
    document.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
    });
    
    document.addEventListener('touchend', (e) => {
        if (!startY || !startX) return;
        
        const endY = e.changedTouches[0].clientY;
        const endX = e.changedTouches[0].clientX;
        
        const deltaY = startY - endY;
        const deltaX = startX - endX;
        
        // Determine if it's a vertical or horizontal swipe
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            // Vertical swipe
            if (Math.abs(deltaY) > minSwipeDistance) {
                const currentSlide = getCurrentSlideIndex();
                const slides = document.querySelectorAll('.slide');
                
                if (deltaY > 0 && currentSlide < slides.length - 1) {
                    // Swipe up - next slide
                    navigateToSlideByIndex(currentSlide + 1);
                } else if (deltaY < 0 && currentSlide > 0) {
                    // Swipe down - previous slide
                    navigateToSlideByIndex(currentSlide - 1);
                }
            }
        }
        
        startY = 0;
        startX = 0;
    });
}

// Initialize touch navigation
setupTouchNavigation();

// Add presentation mode functionality
function enterPresentationMode() {
    document.body.classList.add('presentation-mode');
    
    // Hide navigation and controls
    const navbar = document.querySelector('.navbar');
    const controls = document.querySelector('.slide-controls');
    
    if (navbar) navbar.style.display = 'none';
    if (controls) controls.style.display = 'none';
    
    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    }
}

function exitPresentationMode() {
    document.body.classList.remove('presentation-mode');
    
    // Show navigation and controls
    const navbar = document.querySelector('.navbar');
    const controls = document.querySelector('.slide-controls');
    
    if (navbar) navbar.style.display = 'block';
    if (controls) controls.style.display = 'flex';
    
    // Exit fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

// Add print functionality
function printPresentation() {
    window.print();
}

// Export functions for external use
window.PresentationTemplate = {
    navigateToSlide: navigateToSlideByIndex,
    getCurrentSlide: getCurrentSlideIndex,
    enterPresentationMode,
    exitPresentationMode,
    printPresentation,
    updateProgress
};

// Add some additional interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to service cards
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
    
    // Add click effects to team cards
    const teamCards = document.querySelectorAll('.team-card');
    teamCards.forEach(card => {
        card.addEventListener('click', function() {
            // Add a simple click animation
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'translateY(-5px)';
            }, 150);
        });
    });
    
    // Add loading animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease-in-out';
        document.body.style.opacity = '1';
    }, 100);
});

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debouncing to scroll handler
const debouncedUpdateProgress = debounce(updateProgress, 16); // ~60fps
window.addEventListener('scroll', debouncedUpdateProgress);
