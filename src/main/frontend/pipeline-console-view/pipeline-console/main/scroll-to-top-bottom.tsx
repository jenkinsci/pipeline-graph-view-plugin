import "./scroll-to-top-bottom.scss";

import React, { useEffect, useState } from "react";

import { classNames } from "../../../common/utils/classnames.ts";

export default function ScrollToTopBottom() {
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const atTop = scrollY < 100;
      const atBottom = scrollY + windowHeight >= docHeight - 100;

      setIsAtTop(atTop);
      setIsAtBottom(atBottom);
      setIsScrollable(!(atTop && atBottom));
    };

    updateScrollState();

    window.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    const observer = new MutationObserver(updateScrollState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
    });
  };

  return (
      <div
        className={classNames(`pgv-scroll-to-top-bottom`, {
          "pgv-scroll-to-top-bottom--visible": isScrollable,
        })}
        aria-hidden={!isScrollable}
      >
        <button
          onClick={scrollToTop}
          className="jenkins-button"
          disabled={isAtTop}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="48"
              d="M112 244l144-144 144 144M256 120v292"
            />
          </svg>
        </button>
        <button
          onClick={scrollToBottom}
          className="jenkins-button"
          disabled={isAtBottom}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="48"
              d="M112 268l144 144 144-144M256 392V100"
            />
          </svg>
        </button>
    </div>
  );
}
