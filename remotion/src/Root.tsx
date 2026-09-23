import React from 'react';
import { Composition } from 'remotion';
import { NoiseToTests, NOISE_TO_TESTS_DURATION } from './NoiseToTests';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="NoiseToTests"
      component={NoiseToTests}
      durationInFrames={NOISE_TO_TESTS_DURATION}
      fps={30}
      width={1200}
      height={800}
    />
  );
};
