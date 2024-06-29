import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, Tooltip, Typography } from '@mui/material';
import { StatusChip } from './support/StatusChip';

interface PipelineSummaryProps {
  label: string;
  status: string;
  onClick: () => void;
  startTime: string;
  duration: string;
}

const CustomBox = styled(Box)(({ theme }) => ({
  backgroundColor: 'var(--light-grey)',
  padding: theme.spacing(1),
  display: 'inline-block',
  borderRadius: theme.shape.borderRadius,
}));

export class PipelineSummary extends React.Component<PipelineSummaryProps> {
  render() {
    const { label, status, onClick, startTime, duration } = this.props;

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
              {startTime}
            </Typography>
          }
          placement="bottom"
        >
          <CustomBox>
            <Typography noWrap style={{ fontSize: 'var(--font-size-xs)' }}>{startTime} - {duration}</Typography>
          </CustomBox>
        </Tooltip>
      </Box>
    );
  }
}
