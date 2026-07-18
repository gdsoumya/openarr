import React from 'react';
import { Badge } from '../../../core/components/Badge';
import { colors } from '../../../core/theme/tokens';

interface ContainerStateBadgeProps {
  state: string;   // running | exited | paused | ...
  status?: string; // "Up 3 minutes (healthy)"
}

export function ContainerStateBadge({ state, status }: ContainerStateBadgeProps) {
  const health = status?.match(/\((healthy|unhealthy|health: starting)\)/)?.[1];
  let label = state;
  let color = 'rgba(255,255,255,0.15)';

  if (state === 'running') {
    if (health === 'unhealthy') { label = 'unhealthy'; color = 'rgba(233, 69, 96, 0.85)'; }
    else if (health === 'health: starting') { label = 'starting'; color = 'rgba(255, 193, 7, 0.5)'; }
    else { label = health === 'healthy' ? 'healthy' : 'running'; color = 'rgba(100, 255, 218, 0.25)'; }
  } else if (state === 'exited' || state === 'dead') {
    color = 'rgba(233, 69, 96, 0.4)';
  } else if (state === 'paused' || state === 'restarting') {
    color = 'rgba(255, 193, 7, 0.35)';
  }

  return <Badge label={label} variant="custom" customColor={color} />;
}
