import Tippy, { TippyProps } from "@tippyjs/react";
import React, { useState } from "react";
import Tooltip from "./tooltip.tsx";

/**
 * A customized (and customizable) implementation of Tippy dropdowns
 */
export default function Dropdown({ items, disabled }: DropdownProps) {
  const [visible, setVisible] = useState(false);
  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return (
    <Tooltip content={"More actions"}>
      <Tippy
        visible={visible}
        onClickOutside={hide}
        {...DefaultDropdownProps}
        content={
          <div className="jenkins-dropdown">
            {items.map((item, index) => (
              <a
                key={index}
                className="jenkins-dropdown__item"
                href={item.href}
                target={item.target}
                download={item.download}
              >
                <div className="jenkins-dropdown__item__icon">{item.icon}</div>
                {item.text}
              </a>
            ))}
          </div>
        }
      >
        <button
          className="jenkins-button jenkins-button--tertiary"
          type="button"
          disabled={disabled}
          onClick={visible ? hide : show}
        >
          <div className="jenkins-overflow-button__ellipsis">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </Tippy>
    </Tooltip>
  );
}

export const DefaultDropdownProps: TippyProps = {
  theme: "dropdown",
  duration: 250,
  touch: true,
  animation: "dropdown",
  interactive: true,
  offset: [0, 0],
  placement: "bottom-start",
  arrow: false,
};

interface DropdownProps {
  items: DropdownItem[];
  disabled?: boolean;
}

interface DropdownItem {
  text: string;
  href?: string;
  icon: React.ReactNode;
  target?: string;
  download?: string;
}
