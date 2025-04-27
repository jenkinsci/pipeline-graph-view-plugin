import React, { CSSProperties } from "react";

export function TruncatingLabel({
  children,
  style = {},
  className = "",
}: TruncatingLabelProps) {
  const mergedStyle: React.CSSProperties = {
    display: "-webkit-box",
    overflow: "hidden",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    ...style,
  };

  return (
    <div style={mergedStyle} className={`TruncatingLabel ${className}`.trim()}>
      {children}
    </div>
  );
}

interface TruncatingLabelProps {
  children: React.ReactNode;
  style?: CSSProperties;
  className?: string;
}
