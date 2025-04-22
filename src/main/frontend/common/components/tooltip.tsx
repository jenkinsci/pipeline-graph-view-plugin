import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    Behaviour: any;
  }
}

/**
 * Provides a bridge between React and the Jenkins' tooltip component
 */
export default function Tooltip({ text, children, properties = {} }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    window.Behaviour?.applySubtree(ref.current.parentNode, true);
  }, []);

  return (
    <div {...{ tooltip: text }} ref={ref} {...properties}>
      {children}
    </div>
  );
}

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  properties?: React.HTMLProps<HTMLDivElement>;
}
