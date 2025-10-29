// components/LogicConnector.tsx
import React from "react";

interface LogicConnectorProps {
  connector?: "AND" | "OR" | "NOT";
  onChange?: (value: "AND" | "OR" | "NOT") => void;
}

export function LogicConnector({ connector = "AND", onChange }: LogicConnectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-gray-700">Logic</label>
      <select
        value={connector}
        onChange={(e) => onChange?.(e.target.value as "AND" | "OR")}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="AND">AND</option>
        <option value="OR">OR</option>
      </select>
    </div>
  );
}
export default LogicConnector;
