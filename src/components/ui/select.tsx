// components/ui/select.tsx
/*import React, { FC, ChangeEvent } from 'react';

interface SelectProps {
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const Select: FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
}) => {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      className={`border rounded p-2 ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export default Select;*/
import * as React from "react";
import { forwardRef } from "react";

// Main Select component wrapper
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  (props, ref) => {
    return <select ref={ref} {...props} className="border rounded p-2" />;
  }
);
Select.displayName = "Select";

// Trigger component (clickable part of the select)
export const SelectTrigger = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className="border rounded px-3 py-2 bg-white hover:bg-gray-50 focus:outline-none"
      />
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

// Value component (displays selected value)
export const SelectValue: React.FC<{ value?: string; placeholder?: string }> = ({
  value,
  placeholder = "Select...",
}) => {
  return <span>{value || placeholder}</span>;
};

// Content component (dropdown options container)
export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="absolute mt-1 border rounded bg-white shadow-md">{children}</div>;
};

// Item component (each option in the dropdown)
export const SelectItem: React.FC<{ value: string; children: React.ReactNode }> = ({
  value,
  children,
}) => {
  return (
    <div
      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
      data-value={value}
      role="option"
    >
      {children}
    </div>
  );
};

