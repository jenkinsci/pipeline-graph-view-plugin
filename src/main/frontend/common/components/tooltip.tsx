import React, { useEffect, useRef } from "react";

/**
 * Provides a bridge between React and the Jenkins' tooltip component
 */
export default function Tooltip({ text, children }: TooltipProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    // @ts-ignore
    Behaviour.applySubtree(ref.current.parentNode, true);
  }, []);

  return (
    <span {...{ tooltip: text }} ref={ref}>
      {children}
    </span>
  );
}

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}
