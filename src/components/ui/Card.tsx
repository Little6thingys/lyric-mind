// src/components/ui/Card.tsx
import React from "react";

interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-gray-200 backdrop-blur-sm dark:border-slate-700 rounded-lg shadow-sm p-4 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
