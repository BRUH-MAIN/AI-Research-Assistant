# AI Research Assistant - Technical Presentation Template

A comprehensive, professional presentation template showcasing the technical architecture and implementation details of the AI Research Assistant project.

## Overview

This presentation template provides a detailed technical walkthrough of a 3-service separated architecture for academic paper research with AI integration. The presentation is designed to be professional, clean, and well-structured while providing comprehensive coverage of all technical aspects.

## Features

- **13 Professional Slides** covering all aspects of the system architecture
- **Responsive Design** that works on all devices and screen sizes
- **Interactive Navigation** with smooth scrolling and keyboard controls
- **Professional Styling** with consistent branding and typography
- **Clean Code Structure** with modern HTML5, CSS3, and JavaScript
- **Print-Ready** with proper print styles for PDF export

## Slide Structure

1. **Introduction** - Project overview and team information
2. **Problem Statement** - Research challenges and motivations
3. **Objective** - Project goals and deliverables
4. **System Architecture** - 3-service separated architecture overview
5. **AI Implementation** - RAG engine and AI processing details
6. **Technology Stack** - Complete tech stack with tools and frameworks
7. **Database Design** - PostgreSQL schema and security features
8. **UML Diagrams** - Class and sequence diagrams
9. **API Architecture** - Service communication patterns
10. **Express DB Server** - Database operations hub details
11. **FastAPI Server** - AI processing engine specifics
12. **Database Operations** - RPC functions and triggers
13. **Conclusion** - Summary and future enhancements

## Key Technical Highlights

### Architecture Features
- **Complete service separation** - FastAPI has zero database access
- **Express as database proxy** - All data operations centralized
- **JWT authentication** across all services
- **Rate limiting and security** measures

### Database Features
- **50+ RPC functions** for complex business logic
- **Row-Level Security (RLS)** for data protection
- **Real-time subscriptions** for live collaboration
- **Automated triggers** for data integrity

### AI Implementation
- **RAG-based processing** for enhanced accuracy
- **In-memory fallback** for improved reliability
- **Vector embeddings** for semantic search
- **HTTP client communication** for data persistence

## Usage

### Viewing the Presentation

1. Open `index.html` in a modern web browser
2. Use navigation controls or keyboard shortcuts:
   - **Arrow keys**: Navigate between slides
   - **Space bar**: Next slide
   - **Home/End**: First/Last slide
   - **F11**: Toggle fullscreen
   - **Esc**: Exit fullscreen

### Navigation Options

- **Top Navigation Bar**: Click on slide titles for direct navigation
- **Slide Controls**: Use the floating buttons (bottom right)
- **Keyboard Controls**: Full keyboard navigation support
- **Touch Controls**: Swipe gestures on mobile devices
- **Progress Indicator**: Visual progress tracking (bottom left)

### Customization

#### Replacing Diagrams
- Replace placeholder images in the `img/` directory
- Update image references in `index.html`
- Supported formats: PNG, JPG, SVG

#### Updating Content
- Modify slide content directly in `index.html`
- Update navigation links when adding/removing slides
- Maintain consistent styling classes for animations

#### Styling Changes
- Edit `styles.css` for design modifications
- CSS custom properties (variables) for easy theming
- Responsive breakpoints for mobile optimization

#### Adding Slides
1. Copy an existing slide section
2. Update the slide ID and number
3. Add navigation link to the navbar
4. Update total slide count in JavaScript

## Technical Implementation

### HTML Structure
- Semantic HTML5 with ARIA accessibility
- Bootstrap 5.3 for responsive grid system
- Font Awesome icons for visual elements
- Google Fonts (Inter + JetBrains Mono)

### CSS Features
- CSS Custom Properties for theming
- CSS Grid and Flexbox for layouts
- CSS Animations for smooth transitions
- Print media queries for PDF export

### JavaScript Functionality
- Intersection Observer API for animations
- Smooth scrolling navigation
- Progress tracking
- Touch/swipe gesture support
- Keyboard navigation
- Fullscreen API integration

## Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile Support**: iOS Safari 12+, Chrome Mobile 60+
- **Features**: CSS Grid, Intersection Observer, ES6+

## Performance Optimization

- **Debounced scroll events** for smooth performance
- **Will-change properties** for animation optimization
- **Efficient DOM queries** with caching
- **Lazy loading** for large images
- **Minified external libraries** via CDN

## Accessibility Features

- **Semantic HTML** structure
- **ARIA labels** for screen readers
- **High contrast** color scheme
- **Keyboard navigation** support
- **Focus management** for interactive elements

## Export Options

### PDF Export
- Use browser print function (Ctrl/Cmd + P)
- Select "Save as PDF" destination
- Print styles automatically applied
- Each slide on separate page

### HTML Package
- Download entire template folder
- Self-contained with all assets
- No external dependencies required

## Development

### File Structure
```
template/
├── index.html          # Main presentation file
├── styles.css          # Custom styling
├── script.js           # Interactive functionality
├── img/               # Images and diagrams
│   └── placeholder.svg # Diagram placeholder
└── README.md          # This documentation
```

### Dependencies
- Bootstrap 5.3.0 (CDN)
- Font Awesome 6.0.0 (CDN)
- Google Fonts: Inter, JetBrains Mono (CDN)

### Local Development
1. Clone or download the template
2. Open `index.html` in a web browser
3. No build process required
4. Edit files directly and refresh browser

## Contributing

To improve this presentation template:

1. **Content Updates**: Modify slide content in `index.html`
2. **Design Improvements**: Update styles in `styles.css`
3. **Feature Additions**: Extend functionality in `script.js`
4. **Documentation**: Update this README.md

## License

This presentation template is part of the AI Research Assistant project developed by Team-08 at the School of AI, Amrita Vishwa Vidyapeetham.

---

## Contact

For questions about this presentation template or the AI Research Assistant project, please contact the development team.

**Project**: AI Research Assistant  
**Team**: Team-08  
**Institution**: School of AI, Amrita Vishwa Vidyapeetham  
**Year**: 2024
