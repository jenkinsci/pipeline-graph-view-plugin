import React from "react";
import { StepInfo, StepLogBufferInfo } from "./PipelineConsoleModel";
import { getStepStatus } from "../../../step-status/StepStatus";
import CloseIcon from "./CloseIcon";

export interface ConsoleLogModelProps {
  logBuffer: StepLogBufferInfo;
  handleMoreConsoleClick: (nodeId: string, startByte: number) => void;
  step: StepInfo;
  truncatedLogWarning: React.JSX.Element | undefined;
  maxHeightScale: number;
  setClose: () => void;
  open: boolean;
}

import ConsoleLogStream from "./ConsoleLogStream";

const style = {
  top: "50%",
  left: "50%",
  width: "98%",
  height: "95%",
  margin: "1%",
  bgcolor: "var(--pre-background)",
  color: "var(--pre-color)",
  backdropFilter: "var(--dialog-backdrop-filter)",
  border: "none",
  backgroundColor: "var(--background)",
  borderRadius: "0.6rem",
  boxShadow: "var(--dialog-box-shadow)",
  overflowY: "auto",
  p: 4,
};

export default function ConsoleLogModal(props: ConsoleLogModelProps) {
  const handleClose = () => props.setClose();
  const statusIcon = getStepStatus(
    props.step.state,
    props.step.completePercent,
    10,
  );
  const stepDisplayName = props.step.name;
  const stepTitle = props.step.title ? " - " + props.step.title : "";

  return (
    <>
      {/*<Modal*/}
      {/*  open={props.open}*/}
      {/*  onClose={handleClose}*/}
      {/*  aria-labelledby="modal-modal-title"*/}
      {/*  aria-describedby="modal-modal-description"*/}
      {/*>*/}
      {/*  <Box sx={style}>*/}
      {/*    <Typography*/}
      {/*      id="modal-modal-title"*/}
      {/*      variant="h6"*/}
      {/*      component="h2"*/}
      {/*      className="log-card--header"*/}
      {/*      noWrap={true}*/}
      {/*      key={`step-name-text-${props.step.id}`}*/}
      {/*    >*/}
      {/*      <Stack direction="row" alignItems="center" spacing={1}>*/}
      {/*        {statusIcon}*/}
      {/*        <Box component="span">*/}
      {/*          <Box component="span" fontWeight="bold">*/}
      {/*            {stepDisplayName}*/}
      {/*          </Box>*/}
      {/*          {stepTitle}*/}
      {/*        </Box>*/}
      {/*      </Stack>*/}
      {/*    </Typography>*/}
      {/*    <CloseIcon onClick={handleClose} />*/}
      {/*    <div>{props.truncatedLogWarning}</div>*/}
      {/*    <ConsoleLogStream {...props} />*/}
      {/*  </Box>*/}
      {/*</Modal>*/}
    </>
  );
}
