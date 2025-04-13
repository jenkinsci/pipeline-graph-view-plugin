import React, { useEffect, useRef } from "react";

export default function DropdownWrapper({ items }: DropdownWrapperProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!buttonRef.current) {
      return;
    }

    const template = document.createElement("template");
    template.innerHTML = `
    <div class="jenkins-dropdown">
      ${items
        .map(
          (item) => `
        <template
          data-dropdown-type="ITEM"
          data-dropdown-icon="<svg></svg>"
          data-dropdown-text="${item.text}"
          data-dropdown-href="${item.href || ""}">
        </template>
      `,
        )
        .join("")}
    </div>
  `;
    buttonRef.current.parentNode?.appendChild(template);

    // @ts-ignore
    Behaviour.applySubtree(buttonRef.current.parentNode, true);
  }, []);

  return (
    <>
      <button
        className="jenkins-button jenkins-button--tertiary"
        type="button"
        data-dropdown="true"
        ref={buttonRef}
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

export interface DropdownWrapperProps {
  items: DropdownItem[];
}

export interface DropdownItem {
  text: string;
  href?: string;
  icon: React.ReactElement;
  target?: string;
}
