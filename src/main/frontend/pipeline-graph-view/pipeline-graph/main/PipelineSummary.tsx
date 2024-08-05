import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, Tooltip, Typography } from '@mui/material';
import { StatusChip } from './support/StatusChip';
import { formatDateTime } from "../../../common/TimeConverters";

interface PipelineSummaryProps {
  label: string;
  status: string;
  onClick: () => void;
  startTime: number;
  duration: string;
}

const CustomBox = styled(Box)(({ theme }) => ({
  backgroundColor: 'var(--light-grey)',
  padding: theme.spacing(1),
  display: 'inline-block',
  borderRadius: theme.shape.borderRadius,
  marginTop: '-0.5em',
  zIndex: 1,
  position: 'relative',
}));

export class PipelineSummary extends React.Component<PipelineSummaryProps> {
  render() {
    const { label, status, onClick, startTime, duration } = this.props;
    const fullTimeStamp = formatDateTime(startTime, 'full')
    const shortTimeStamp = formatDateTime(startTime, 'short')

    return (
      <Box display="flex" flexDirection="column" alignItems="flex-start" className="sup">
        <StatusChip
          label={label}
          status={status}
          onClick={onClick}
        />
        <Tooltip
          title={
            <Typography component="div">
              {fullTimeStamp}
            </Typography>
          }
          placement="bottom"
        >
          <CustomBox>
            <Typography noWrap style={{ fontSize: 'var(--font-size-xs)' }}>{shortTimeStamp} - {duration}</Typography>
          </CustomBox>
        </Tooltip>
      </Box>
    );
  }
}
