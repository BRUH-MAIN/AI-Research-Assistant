// AI Research Assistant Presentation JavaScript

let currentSlide = 1;
const totalSlides = 12;

// Initialize presentation
document.addEventListener('DOMContentLoaded', function() {
    updateSlideDisplay();
    updateProgressBar();
    initializeEventListeners();
    
    // Initialize operation tabs
    showOperation('create');
    
    // Initialize example tabs
    showExample('messages');
});

// Event Listeners
function initializeEventListeners() {
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        switch(e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                previousSlide();
                break;
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
                e.preventDefault();
                nextSlide();
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(1);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(totalSlides);
                break;
            case 'Escape':
                e.preventDefault();
                toggleFullscreen();
                break;
        }
    });

    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                previousSlide();
            } else {
                nextSlide();
            }
        }
    }

    // Mouse wheel navigation
    let wheelTimeout;
    document.addEventListener('wheel', function(e) {
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
            if (e.deltaY > 0) {
                nextSlide();
            } else {
                previousSlide();
            }
        }, 100);
    }, { passive: true });

    // Click navigation on slides
    document.querySelectorAll('.slide').forEach(slide => {
        slide.addEventListener('click', function(e) {
            // Only navigate if clicking on the slide background, not on interactive elements
            if (e.target === slide || e.target === slide.querySelector('.slide-content')) {
                nextSlide();
            }
        });
    });
}

// Navigation Functions
function nextSlide() {
    if (currentSlide < totalSlides) {
        currentSlide++;
        updateSlideDisplay();
        updateProgressBar();
        animateSlideTransition('next');
    }
}

function previousSlide() {
    if (currentSlide > 1) {
        currentSlide--;
        updateSlideDisplay();
        updateProgressBar();
        animateSlideTransition('prev');
    }
}

function goToSlide(slideNumber) {
    if (slideNumber >= 1 && slideNumber <= totalSlides && slideNumber !== currentSlide) {
        const direction = slideNumber > currentSlide ? 'next' : 'prev';
        currentSlide = slideNumber;
        updateSlideDisplay();
        updateProgressBar();
        animateSlideTransition(direction);
    }
}

function updateSlideDisplay() {
    // Hide all slides
    document.querySelectorAll('.slide').forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Show current slide
    const activeSlide = document.getElementById(`slide-${currentSlide}`);
    if (activeSlide) {
        activeSlide.classList.add('active');
    }
    
    // Update counter
    document.getElementById('current-slide').textContent = currentSlide;
    document.getElementById('total-slides').textContent = totalSlides;
    
    // Update navigation buttons
    const prevBtn = document.querySelector('.nav-btn:first-of-type');
    const nextBtn = document.querySelector('.nav-btn:last-of-type');
    
    if (prevBtn) {
        prevBtn.disabled = currentSlide === 1;
    }
    if (nextBtn) {
        nextBtn.disabled = currentSlide === totalSlides;
    }
}

function updateProgressBar() {
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        const progressPercentage = (currentSlide / totalSlides) * 100;
        progressFill.style.width = `${progressPercentage}%`;
    }
}

function animateSlideTransition(direction) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach((slide, index) => {
        const slideNumber = index + 1;
        
        if (slideNumber === currentSlide) {
            slide.style.transform = 'translateX(0)';
            slide.style.opacity = '1';
        } else if (slideNumber < currentSlide) {
            slide.style.transform = 'translateX(-100px)';
            slide.style.opacity = '0';
        } else {
            slide.style.transform = 'translateX(100px)';
            slide.style.opacity = '0';
        }
    });
}

// CRUD Operation Tabs
function showOperation(operation) {
    // Hide all operation content
    document.querySelectorAll('.operation-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected operation content
    const selectedContent = document.getElementById(`${operation}-content`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Add active class to selected tab
    const selectedTab = Array.from(document.querySelectorAll('.tab-btn'))
        .find(tab => tab.textContent.toLowerCase() === operation);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
}

// Real-time Example Tabs
function showExample(example) {
    // Hide all example content
    document.querySelectorAll('.example-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.example-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected example content
    const selectedContent = document.getElementById(`${example}-example`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Add active class to selected tab
    const selectedTab = Array.from(document.querySelectorAll('.example-tab'))
        .find(tab => tab.textContent.toLowerCase().includes(example));
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
}

// Utility Functions
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// Auto-advance functionality (optional)
let autoAdvanceInterval;
let isAutoAdvancing = false;

function startAutoAdvance(intervalMs = 10000) {
    if (isAutoAdvancing) return;
    
    isAutoAdvancing = true;
    autoAdvanceInterval = setInterval(() => {
        if (currentSlide < totalSlides) {
            nextSlide();
        } else {
            stopAutoAdvance();
        }
    }, intervalMs);
    
    // Add visual indicator
    document.body.classList.add('auto-advancing');
}

function stopAutoAdvance() {
    if (!isAutoAdvancing) return;
    
    isAutoAdvancing = false;
    clearInterval(autoAdvanceInterval);
    
    // Remove visual indicator
    document.body.classList.remove('auto-advancing');
}

function toggleAutoAdvance() {
    if (isAutoAdvancing) {
        stopAutoAdvance();
    } else {
        startAutoAdvance();
    }
}

// Print functionality
function printPresentation() {
    // Show all slides for printing
    document.querySelectorAll('.slide').forEach(slide => {
        slide.classList.add('active');
    });
    
    window.print();
    
    // Restore normal slide display
    setTimeout(() => {
        updateSlideDisplay();
    }, 1000);
}

// Export to PDF (requires browser support)
async function exportToPDF() {
    if ('showSaveFilePicker' in window) {
        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: 'ai-research-assistant-presentation.pdf',
                types: [{
                    description: 'PDF files',
                    accept: { 'application/pdf': ['.pdf'] }
                }]
            });
            
            // This would require a PDF generation library
            console.log('PDF export would be implemented here');
        } catch (err) {
            console.log('Export cancelled or failed:', err);
        }
    } else {
        // Fallback to print dialog
        printPresentation();
    }
}

// Presentation timer
let presentationStartTime;
let timerInterval;
let isTimerRunning = false;

function startPresentationTimer() {
    if (isTimerRunning) return;
    
    presentationStartTime = Date.now();
    isTimerRunning = true;
    
    timerInterval = setInterval(updateTimer, 1000);
    
    // Add timer display to navigation
    const navContent = document.querySelector('.nav-content');
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'presentation-timer';
    timerDisplay.className = 'timer-display';
    timerDisplay.textContent = '00:00';
    navContent.appendChild(timerDisplay);
}

function stopPresentationTimer() {
    if (!isTimerRunning) return;
    
    isTimerRunning = false;
    clearInterval(timerInterval);
    
    const timerDisplay = document.getElementById('presentation-timer');
    if (timerDisplay) {
        timerDisplay.remove();
    }
}

function updateTimer() {
    if (!isTimerRunning) return;
    
    const elapsed = Math.floor((Date.now() - presentationStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timerDisplay = document.getElementById('presentation-timer');
    if (timerDisplay) {
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Slide notes functionality
const slideNotes = {
    1: "Welcome to our presentation on the AI Research Assistant database architecture. This project demonstrates a comprehensive DBMS solution for research collaboration.",
    2: "Today we'll cover the complete database architecture, from problem identification to implementation details and future enhancements.",
    3: "Research challenges are numerous - from information overload to collaboration difficulties. Our database design addresses these core issues.",
    4: "The key database challenges include scalability, performance, consistency, and real-time support for AI processing.",
    5: "Our technology stack combines PostgreSQL's robustness with modern web technologies and real-time capabilities.",
    6: "The ER model shows our normalized approach with proper relationships and constraints for data integrity.",
    7: "Our schema design follows 3NF principles with optimized indexing and business rule enforcement.",
    8: "The dual-server architecture separates database operations from AI processing for better performance and maintainability.",
    9: "Performance optimization includes strategic indexing, caching, and query optimization techniques.",
    10: "Security is paramount with multi-layered authentication, authorization, and data protection measures.",
    11: "Real-time features enable seamless collaboration through WebSocket connections and live updates.",
    12: "Our achievements demonstrate a robust, scalable solution with clear paths for future enhancement."
};

function getSlideNotes(slideNumber) {
    return slideNotes[slideNumber] || "No notes available for this slide.";
}

function showSlideNotes() {
    const notes = getSlideNotes(currentSlide);
    alert(`Slide ${currentSlide} Notes:\n\n${notes}`);
}

// Presentation mode toggle
function togglePresentationMode() {
    document.body.classList.toggle('presentation-mode');
    
    if (document.body.classList.contains('presentation-mode')) {
        // Hide navigation and enter full presentation mode
        document.querySelector('.nav-bar').style.display = 'none';
        document.querySelector('.progress-bar').style.display = 'none';
        startPresentationTimer();
    } else {
        // Show navigation and exit presentation mode
        document.querySelector('.nav-bar').style.display = 'block';
        document.querySelector('.progress-bar').style.display = 'block';
        stopPresentationTimer();
    }
}

// Initialize presentation shortcuts
document.addEventListener('keydown', function(e) {
    // Presentation mode shortcuts
    if (e.key === 'F5' || (e.key === 'Enter' && e.altKey)) {
        e.preventDefault();
        togglePresentationMode();
    }
    
    // Notes shortcut
    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        showSlideNotes();
    }
    
    // Auto-advance toggle
    if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        toggleAutoAdvance();
    }
    
    // Print shortcut
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        printPresentation();
    }
});

// Slide transition animations
function addSlideAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const slide = entry.target;
                const animatedElements = slide.querySelectorAll('[data-animate]');
                
                animatedElements.forEach((element, index) => {
                    setTimeout(() => {
                        element.classList.add('animate-in');
                    }, index * 100);
                });
            }
        });
    });
    
    document.querySelectorAll('.slide').forEach(slide => {
        observer.observe(slide);
    });
}

// Performance monitoring
function trackPresentationMetrics() {
    const metrics = {
        slideViews: {},
        timeSpent: {},
        totalTime: 0,
        interactions: 0
    };
    
    let slideStartTime = Date.now();
    
    // Track slide transitions
    const originalGoToSlide = goToSlide;
    window.goToSlide = function(slideNumber) {
        const now = Date.now();
        const timeOnSlide = now - slideStartTime;
        
        metrics.slideViews[currentSlide] = (metrics.slideViews[currentSlide] || 0) + 1;
        metrics.timeSpent[currentSlide] = (metrics.timeSpent[currentSlide] || 0) + timeOnSlide;
        metrics.interactions++;
        
        slideStartTime = now;
        
        return originalGoToSlide(slideNumber);
    };
    
    // Export metrics
    window.getPresentationMetrics = () => metrics;
}

// Initialize all features
document.addEventListener('DOMContentLoaded', function() {
    addSlideAnimations();
    trackPresentationMetrics();
    
    // Add helpful tooltips
    const navBtns = document.querySelectorAll('.nav-btn');
    if (navBtns[0]) navBtns[0].title = 'Previous slide (← or ↑)';
    if (navBtns[1]) navBtns[1].title = 'Next slide (→ or ↓ or Space)';
    
    console.log('🎯 AI Research Assistant Presentation loaded');
    console.log('📋 Shortcuts: Arrow keys (navigate), F5 (presentation mode), N (notes), A (auto-advance), Ctrl+P (print)');
});

// Add CSS for animations
const animationStyles = `
    [data-animate] {
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.6s ease-out;
    }
    
    [data-animate].animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .timer-display {
        background: var(--surface-light);
        color: var(--text-secondary);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: 0.5rem;
        font-family: 'Courier New', monospace;
        font-weight: 500;
        border: 1px solid var(--border);
    }
    
    .presentation-mode .slide-content {
        font-size: 1.1em;
    }
    
    .auto-advancing::after {
        content: '⏯️ Auto-advancing';
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1001;
    }
`;

// Inject animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);
