import React from "react";

interface ButtonsCardProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function ButtonsCard({ children, onClick }: ButtonsCardProps) {
  return (
    <div
      className="relative group cursor-pointer p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
      onClick={onClick}
    >
      <div className="flex items-center justify-center">
        {children}
      </div>
      {onClick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <svg
            className="w-4 h-4 text-gray-400 hover:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
