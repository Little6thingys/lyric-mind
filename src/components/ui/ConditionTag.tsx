// components/ConditionTag.tsx
import React from "react";

interface ConditionTagProps {
  label: string;
 
  color?: "blue" | "orange" | "green" | "red" |"grey";
}

export function ConditionTag({ label,  color = "blue" }: ConditionTagProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-800",
    grey: "bg-gray-100 text-gray-800",
    red: "bg-red-100 text-red-800",
    green: "bg-green-100 text-green-800",
    orange: "bg-orange-100 text-orange-800",
  }[color];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${colorClasses}`}
    >
      {label}
    </span>
  );
}

export default ConditionTag;
