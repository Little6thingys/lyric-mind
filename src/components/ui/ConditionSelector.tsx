// components/ConditionSelector.tsx
import * as React from "react"
import  {Select, SelectTrigger, SelectValue, SelectContent, SelectItem}  from "./select"

interface ConditionSelectorProps {
  label: string
  options: string[]
  value?: string
  onChange: (value: string) => void
}


export function ConditionSelector({ label, options, value, onChange }: ConditionSelectorProps) {
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[200px] border rounded p-2"
      >
        <option value="" disabled>
          {`Select ${label.toLowerCase()}`}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ConditionSelector;
