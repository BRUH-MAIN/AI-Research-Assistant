import React from "react";

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 stroke-current"
    {...props} // allows override of className, style, etc.
  >
    <path
      d="M24.8,13.8L16,5c-2.7-2.7-7-2.7-9.6,0c-2.7,2.7-2.7,7,0,9.6l12.8,12.8
         c1.8,1.8,4.6,1.8,6.4,0c1.8-1.8,1.8-4.6,0-6.4L14.4,9.8
         c-0.9-0.9-2.3-0.9-3.2,0c-0.9,0.9-0.9,2.3,0,3.2l7.2,7.2"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default UploadIcon;
