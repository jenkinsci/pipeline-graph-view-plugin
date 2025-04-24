import Tippy from "@tippyjs/react";
import React, { useState } from "react";
import Tooltip from "./tooltip-tippy";

/**
 * A customized (and customizable) implementation of Tippy dropdowns
 */
export default function Dropdown({ items, disabled }: DropdownProps) {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const showDropdown = () => setDropdownVisible(true);
  const hideDropdown = () => setDropdownVisible(false);

  return (
      <Tooltip content={"More actions"}>
        <Tippy
          theme="dropdown"
          duration={300}
          touch={true}
          visible={dropdownVisible}
          animation="dropdown"
          onClickOutside={hideDropdown}
          interactive={true}
          placement="bottom-end"
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
                  <div className="jenkins-dropdown__item__icon">
                    {item.icon}
                  </div>
                  {item.text}
                </a>
              ))}
            </div>
          }
        >
          <button
            className="jenkins-button jenkins-button--tertiary"
            type="button"
            data-dropdown="true"
            disabled={disabled}
            onClick={dropdownVisible ? hideDropdown : showDropdown}
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
