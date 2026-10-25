import { CSSProperties } from "react";

export function TruncatingLabel({
  children,
  style = {},
  className = "",
  showTitle = true,
}: TruncatingLabelProps) {
  const mergedStyle: CSSProperties = {
    display: "-webkit-box",
    overflow: "hidden",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    ...style,
  };

  return (
    <div
      style={mergedStyle}
      className={`TruncatingLabel ${className}`.trim()}
      title={showTitle ? children : undefined}
    >
      {children}
    </div>
  );
}

interface TruncatingLabelProps {
  children: string;
  style?: CSSProperties;
  className?: string;
  showTitle?: boolean;
}
