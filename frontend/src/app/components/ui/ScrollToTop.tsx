"use client";

import React, { useState, useEffect } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';

interface ScrollToTopProps {
  showAfter?: number; // pixels scrolled before showing button
  className?: string;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ 
  showAfter = 300, 
  className = "" 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled up to given distance
  const toggleVisibility = () => {
    if (window.pageYOffset > showAfter) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Set the top cordinate to 0
  // make scrolling smooth
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [showAfter]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isVisible && (
        <button
          className={`
            p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg 
            transition-all duration-300 ease-in-out transform hover:scale-110
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
            focus:ring-offset-gray-900 ${className}
          `}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ChevronUpIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default ScrollToTop;
