import React from "react";

const ArrowIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-10 h-10 stroke-current"
    {...props}
  >
    <circle
      cx="16"
      cy="16"
      r="13"
      stroke="currentColor"
      strokeWidth={0}
      fill="none"
    />
    <line
      x1="16"
      y1="23"
      x2="16"
      y2="10"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="12,14 16,10 20,14"
      stroke="currentColor"
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ArrowIcon;
