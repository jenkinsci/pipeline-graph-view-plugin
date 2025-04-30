import "./skeleton.scss";

import React from "react";

export default function Skeleton({ height }: { height?: number }) {
  return (
    <div
      className={"pgv-skeleton"}
      style={
        height
          ? {
              height: `${height}rem`,
            }
          : {}
      }
    />
  );
}
