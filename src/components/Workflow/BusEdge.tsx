import { BaseEdge, type EdgeProps } from '@xyflow/react';
import React from 'react';
import { getBusPath } from './workflowLayout';

export const BusEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandleId,
  targetHandleId,
  data,
  style,
  markerEnd,
  markerStart,
  interactionWidth,
}) => {
  const busMode = (data?.busMode as 'convergence' | 'divergence' | 'dual') || 'convergence';
  const railYOffset = typeof data?.railYOffset === 'number' ? data.railYOffset : undefined;

  const path = getBusPath({
    sourceX,
    sourceY,
    sourceHandle: sourceHandleId,
    targetX,
    targetY,
    targetHandle: targetHandleId,
    busMode,
    railYOffset,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
      interactionWidth={interactionWidth}
    />
  );
};
