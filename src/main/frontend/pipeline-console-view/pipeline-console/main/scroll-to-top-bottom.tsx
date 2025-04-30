import "./scroll-to-top-bottom.scss";

import { useEffect, useState } from "react";

import { classNames } from "../../../common/utils/classnames.ts";

export default function ScrollToTopBottom() {
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      const atTop = scrollTop <= 10;
      const atBottom = scrollTop + windowHeight >= docHeight - 10;
      const scrollable = docHeight > windowHeight + 10;

      setIsAtTop(atTop);
      setIsAtBottom(atBottom);
      setIsScrollable(scrollable);

      // Distance from bottom
      const distanceFromBottom = docHeight - (scrollTop + windowHeight);

      // Only trigger the offset if we're within 20px from the bottom
      const offset = Math.max(0, Math.min(100, 100 - distanceFromBottom));

      const root = document.documentElement;
      root.style.setProperty("--pgv-offset-bottom", `${offset}px`);
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
      top: document.documentElement.scrollHeight,
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
