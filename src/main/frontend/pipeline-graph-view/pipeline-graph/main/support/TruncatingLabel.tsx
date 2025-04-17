import React, { CSSProperties, useEffect, useRef, useState } from "react";

export function TruncatingLabel({ children, style = {}, className = "" }: Props) {
  const [renderState, setRenderState] = useState(RenderState.INITIAL);
  const [innerText, setInnerText] = useState(children);
  const elementRef = useRef<HTMLDivElement>(null);

  const completeText = useRef<string>("");
  const textCutoffLength = useRef(0);
  const longestGood = useRef(MINLENGTH);
  const shortestBad = useRef(0);
  const loopCount = useRef(0);
  const checkSizeRequest = useRef<number>();

  // Handle props
  useEffect(() => {
    if (typeof children === "string") {
      completeText.current = children;
    } else if (children === null || children === false) {
      completeText.current = "";
    } else {
      console.warn("TruncatingLabel - Label children must be string but is", typeof children, children);
      completeText.current = "Contents must be string";
    }

    setInnerText(completeText.current);
    loopCount.current = 0;
    longestGood.current = MINLENGTH;
    shortestBad.current = completeText.current.length;
    textCutoffLength.current = completeText.current.length;
    setRenderState(RenderState.MEASURE);
  }, [children]);

  // Resize check effect
  useEffect(() => {
    if (renderState === RenderState.STABLE) return;

    const checkSize = () => {
      checkSizeRequest.current = undefined;
      const el = elementRef.current;
      if (!el) return;

      const { scrollHeight, clientHeight, scrollWidth, clientWidth } = el;
      const tooBig = scrollHeight > clientHeight || scrollWidth > clientWidth;

      if (renderState === RenderState.MEASURE) {
        if (tooBig) {
          setRenderState(RenderState.FLUID);
        } else {
          setRenderState(RenderState.STABLE);
        }
        return;
      }

      if (renderState === RenderState.FLUID) {
        loopCount.current++;
        const lastLength = textCutoffLength.current;

        let keepMeasuring = true;
        if (loopCount.current >= MAXLOOPS || lastLength <= MINLENGTH || Math.abs(shortestBad.current - longestGood.current) < 2) {
          keepMeasuring = false;
        } else {
          if (tooBig) {
            shortestBad.current = Math.min(shortestBad.current, lastLength);
          } else {
            longestGood.current = Math.max(longestGood.current, lastLength);
          }

          textCutoffLength.current = Math.floor((longestGood.current + shortestBad.current) / 2);
          const newInnerText = completeText.current.substring(0, textCutoffLength.current) + "…";
          if (el) el.innerText = newInnerText;
          setInnerText(newInnerText);
        }

        if (keepMeasuring) {
          requestAnimationFrame(checkSize);
        } else {
          setRenderState(RenderState.STABLE);
        }
      }
    };

    checkSizeRequest.current = requestAnimationFrame(checkSize);
    return () => {
      if (checkSizeRequest.current) {
        cancelAnimationFrame(checkSizeRequest.current);
        checkSizeRequest.current = undefined;
      }
    };
  }, [renderState]);

  const mergedStyle: React.CSSProperties = {
    overflow: "hidden",
    wordWrap: "break-word",
    ...style,
    opacity: renderState === RenderState.STABLE ? 1 : 0,
  };

  return (
    <div
      ref={elementRef}
      style={mergedStyle}
      className={`TruncatingLabel ${className}`.trim()}
      title={completeText.current}
    >
      {innerText}
    </div>
  );
}

const MINLENGTH = 5;
const MAXLOOPS = 50;

enum RenderState {
  INITIAL,
  MEASURE,
  FLUID,
  STABLE,
}

interface Props {
  children: React.ReactNode;
  style?: CSSProperties;
  className?: string;
}
