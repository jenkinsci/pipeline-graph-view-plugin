
import React from 'react';
import { styled } from '@mui/material/styles';
import Chip from '@mui/material/Chip';

interface StatusChipProps {
  label: string;
  status: string;
  onClick: () => void;
}

const StyledChip = styled(Chip)(() => ({
  '.MuiChip-label': {
    fontSize: 'var(--font-size-xs)'
  },

  '&.in_progress': {
    borderColor: 'var(--in-progress-color)',
    color: 'var(--text-color)'
  },
  '&.failure': {
    borderColor: 'var(--red)',
    color: 'var(--text-color)'
  },
  '&.success': {
    borderColor: 'var(--success-color)',
    color: 'var(--text-color)'
  },
}));

export class StatusChip extends React.Component<StatusChipProps> {
  render() {
    const { label, status, onClick } = this.props;

    return (
      <StyledChip
        label={label}
        className={`${status} outlined`}
        onClick={onClick}
        size="small"
        variant="outlined"
        clickable
      />
    );
  }
}
