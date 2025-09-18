import React from 'react';

interface ChevronLeftIconProps {
  className?: string;
  size?: number;
}

const ChevronLeftIcon: React.FC<ChevronLeftIconProps> = ({ className = "", size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
};

export default ChevronLeftIcon;