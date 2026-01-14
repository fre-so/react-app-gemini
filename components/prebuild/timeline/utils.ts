import type { MotionValue } from 'motion/react';

export type TimelineStepRenderProps = {
  stepIndex: number;
  isActive: boolean;
  scrollProgress: MotionValue<number>;
};

export type TimelineMediaRenderProps = {
  stepIndex: number;
  isActive: boolean;
  scrollProgress: MotionValue<number>;
};

export const DEFAULT_STEP_COUNT = 5;
export const MAX_STEP_COUNT = 8;

export type MediaGroup = {
  key: string | number;
  startIndex: number;
  endIndex: number;
  stepIndices: number[];
};

export function buildMediaGroups(stepCount: number, getMediaKey: (stepIndex: number) => string | number) {
  const groups: MediaGroup[] = [];

  for (let index = 0; index < stepCount; index += 1) {
    const mediaKey = getMediaKey(index);
    const lastGroup = groups.at(-1);
    if (!lastGroup || lastGroup.key !== mediaKey) {
      groups.push({
        key: mediaKey,
        startIndex: index,
        endIndex: index,
        stepIndices: [index],
      });
      continue;
    }

    lastGroup.endIndex = index;
    lastGroup.stepIndices.push(index);
  }

  return groups;
}
