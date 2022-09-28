import { FunctionComponent } from "react";
import * as React from "react";

interface Props {
  inProgress?: boolean;
  size?: string;
  text?: string;
}

const Component: FunctionComponent<Props> = (props: Props) => {
  console.log(props.inProgress);

  const value = {
    iconClassName: "yellow",
    statusClassName: "last-unstable",
    size: props.size ? props.size : "xlg",
    imagesPath: "/jenkins/images",
    outerClassName: props.inProgress ? "in-progress" : "static",
  };

  return (
    <span
      className={`build-status-icon__wrapper icon-${value.iconClassName} icon-${value.size}`}
    >
      <span className="build-status-icon__outer">
        <svg viewBox="0 0 24 24" focusable="false" className="svg-icon ">
          <use
            href={`${value.imagesPath}/build-status/build-status-sprite.svg#build-status-${value.outerClassName}`}
          />
        </svg>
      </span>
      <svg
        viewBox="0 0 24 24"
        focusable="false"
        className="svg-icon icon-yellow icon-xlg"
      >
        <use
          href={`${value.imagesPath}/build-status/build-status-sprite.svg#${value.statusClassName}`}
        />
      </svg>
    </span>
  );
};

export default Component;
