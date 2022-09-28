import { CSSProperties, FunctionComponent } from "react";
import * as React from "react";
import IonIcon from "@reacticons/ionicons";
import { Result } from "../pipeline-graph-view/pipeline-graph/main";

interface Props {
  status: Result;
  text: string;
}

const Component: FunctionComponent<Props> = (props: Props) => {
  const status = getStepStatus(props.status);
  return (
    <>
      {status}
      {props.text}
    </>
  );
};

const stepStyle: CSSProperties = {
  marginRight: "0.2rem",
  verticalAlign: "text-top",
};

function getStepStatus(status: Result) {
  switch (status) {
    case "success":
      return <IonIcon name="checkmark-circle-outline" style={stepStyle} />;
    case "failure":
      const failureStyles = { ...stepStyle, color: "var(--red)" };
      return <IonIcon name="close-circle-outline" style={failureStyles} />;
    case "unstable":
      const unstableStyles = { ...stepStyle, color: "var(--orange)" };
      return (
        <IonIcon
          name="close-circle-outline"
          color={"var(--orange) !important"}
          style={unstableStyles}
        />
      );
    case "queued":
    case "paused":
    case "not_built":
    case "skipped":
    case "running":
    case "aborted":
      return (
        <IonIcon name="ellipsis-horizontal-circle-outline" style={stepStyle} />
      );
    default:
      return <IonIcon name="help-circle-outline" style={stepStyle} />;
  }
}

export default Component;
