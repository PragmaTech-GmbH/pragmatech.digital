import React from 'react';
import { Composition } from 'remotion';
import { NoiseToTests, NOISE_TO_TESTS_DURATION } from './NoiseToTests';
import { AttentionBottleneck, ATTENTION_BOTTLENECK_DURATION } from './AttentionBottleneck';
import { FeedbackEngine, FEEDBACK_ENGINE_DURATION } from './FeedbackEngine';
import { SafetyNetFlow, SAFETY_NET_FLOW_DURATION } from './SafetyNetFlow';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="NoiseToTests"
        component={NoiseToTests}
        durationInFrames={NOISE_TO_TESTS_DURATION}
        fps={30}
        width={1200}
        height={800}
      />
      <Composition
        id="AttentionBottleneck"
        component={AttentionBottleneck}
        durationInFrames={ATTENTION_BOTTLENECK_DURATION}
        fps={30}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />
      <Composition
        id="FeedbackEngine"
        component={FeedbackEngine}
        durationInFrames={FEEDBACK_ENGINE_DURATION}
        fps={30}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />
      <Composition
        id="SafetyNetFlow"
        component={SafetyNetFlow}
        durationInFrames={SAFETY_NET_FLOW_DURATION}
        fps={30}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />
    </>
  );
};
