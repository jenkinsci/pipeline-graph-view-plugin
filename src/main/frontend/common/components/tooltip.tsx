import Tippy, { TippyProps } from "@tippyjs/react";
import React from "react";

/**
 * A customized (and customizable) implementation of Tippy tooltips
 */
export default function Tooltip(props: TippyProps) {
  if (props.content === undefined) {
    return props.children;
  }

  return (
    <Tippy
      theme="tooltip"
      animation="tooltip"
      duration={250}
      touch={false}
      {...props}
    >
      {props.children}
    </Tippy>
  );
}
