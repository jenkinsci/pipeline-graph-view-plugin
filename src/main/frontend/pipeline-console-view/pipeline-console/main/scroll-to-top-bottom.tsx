import "./scroll-to-top-bottom.scss";

import { useEffect, useRef, useState } from "react";

import TailLogsButton, {
  TailLogsButtonProps,
} from "../../../common/components/tail-logs-button.tsx";
import { classNames } from "../../../common/utils/classnames.ts";

export default function ScrollToTopBottom(props: TailLogsButtonProps) {
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const scrolledToBottomRef = useRef<HTMLDivElement>(null);
  const [headerSize, setHeaderSize] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const header = document.querySelector("header")!;
      setHeaderSize(header.getBoundingClientRect().height);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const appBar = document.querySelector(".jenkins-app-bar")!;
    const observeTop = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === appBar) {
            setIsAtTop(entry.isIntersecting);
          } else {
            setIsAtBottom(entry.isIntersecting);
          }
        }
      },
      {
        threshold: 1, // Fully visible.
        rootMargin: `-${headerSize}px 0px 0px 0px`,
      },
    );
    observeTop.observe(appBar);
    observeTop.observe(scrolledToBottomRef.current!);
    return () => observeTop.disconnect();
  }, [headerSize]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
    });
  };

  const scrollToBottom = () => {
    scrolledToBottomRef.current?.scrollIntoView({ block: "end" });
  };

  const isScrollable = !isAtTop || !isAtBottom || !props.complete;
  return (
    <>
      <div
        className={classNames(`pgv-scroll-to-top-bottom`, {
          "pgv-scroll-to-top-bottom--visible": isScrollable,
        })}
        aria-hidden={!isScrollable}
      >
        <TailLogsButton {...props} />
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
      <div
        ref={scrolledToBottomRef}
        style={{
          // --section-padding - padding - border.
          scrollMarginBlockEnd: "calc(var(--section-padding) - 0.375rem - 2px)",
        }}
      />
    </>
  );
}
