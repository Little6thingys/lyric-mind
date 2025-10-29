// src/components/ui/ScrollArea.tsx
import React, { useEffect, useRef } from "react";

interface ScrollAreaProps {
  children?: React.ReactNode;
  className?: string;
  followBottom?: boolean;
}

const ScrollArea: React.FC<ScrollAreaProps> = ({ children, className = "", followBottom = false }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (followBottom && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [children, followBottom]);

  return (
    <div ref={ref} className={`overflow-auto ${className}`} style={{ maxHeight: "calc(100% - 10px)" }}>
      {children}
    </div>
  );
};

export default ScrollArea;
