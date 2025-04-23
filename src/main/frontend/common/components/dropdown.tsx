import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    Behaviour: any;
  }
}

/**
 * Provides a bridge between React and the Jenkins' dropdown component
 */
export default function Dropdown({ items, disabled }: DropdownProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!buttonRef.current) {
      return;
    }

    const parentNode = buttonRef.current.parentNode;
    if (!parentNode) {
      return;
    }

    const existingTemplates = parentNode.querySelectorAll("template");
    existingTemplates.forEach((template) => template.remove());

    console.log("called on items", items)

    const template = document.createElement("template");
    template.innerHTML = `
    <div class="jenkins-dropdown">
      ${items
        .map(
          (item) => `
        <template data-dropdown-type="CUSTOM">
          <a class="jenkins-dropdown__item" href=${item.href}
             ${item.target ? `target="${item.target}"` : ""}
             ${item.download ? `download="${item.download}"` : ""}>
            <div class="jenkins-dropdown__item__icon">${item.icon}</div>
            ${item.text}
          </a>
        </template>
      `,
        )
        .join("")}
    </div>
  `;
    parentNode.appendChild(template);

    window.Behaviour?.applySubtree(parentNode, true);
  }, [items]);

  return (
    <>
      <button
        className="jenkins-button jenkins-button--tertiary"
        type="button"
        data-dropdown="true"
        {...{ tooltip: "More actions" }}
        ref={buttonRef}
        disabled={disabled}
      >
        <div className="jenkins-overflow-button__ellipsis">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
    </>
  );
}

interface DropdownProps {
  items: DropdownItem[];
  disabled?: boolean;
}

interface DropdownItem {
  text: string;
  href?: string;
  icon: string;
  target?: string;
  download?: string;
}
