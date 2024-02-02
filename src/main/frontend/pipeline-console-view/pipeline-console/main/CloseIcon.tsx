import React from "react";

export type CloseIconProps = {
  onClick: () => void;
};

export default function CloseIcon(props: CloseIconProps) {
  return (
    <>
      <button
        onClick={props.onClick}
        className="jenkins-dialog__close-button jenkins-button"
      >
        <span className="jenkins-visually-hidden">Close</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="ionicon"
          viewBox="0 0 512 512"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="32"
            d="M368 368L144 144M368 144L144 368"
          ></path>
        </svg>
      </button>
    </>
  );
}
