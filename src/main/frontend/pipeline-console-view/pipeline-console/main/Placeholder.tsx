import React from "react";
import "./placeholder.scss";

export default function Placeholder({ height = 1 }: { height?: number }) {
  return <div className="pgv-placeholder" style={{ height: height + "lh" }} />;
}
