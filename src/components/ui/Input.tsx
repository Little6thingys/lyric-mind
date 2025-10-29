// src/components/ui/Input.tsx
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className = "", ...rest }, ref) => {
  return (
    <input
      ref={ref}
      {...rest}
      className={`border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
    />
  );
});

export default Input;
