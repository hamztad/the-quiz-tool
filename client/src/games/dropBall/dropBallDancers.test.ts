import { describe, expect, it } from 'vitest';
import {
  applyDropBallDancerHits,
  createDropBallDancers,
  hitDropBallDancer,
} from './dropBallDancers';

describe('dropBallDancers', () => {
  it('detects ball overlap with a dancer', () => {
    const [dancer] = createDropBallDancers();
    const launch = hitDropBallDancer(dancer, dancer.x, dancer.y, 10);
    expect(launch).not.toBeNull();
    expect(launch?.dx).toBeDefined();
  });

  it('ignores hits when dancer already launched', () => {
    const [dancer] = createDropBallDancers();
    const launched = { ...dancer, launched: true };
    expect(hitDropBallDancer(launched, dancer.x, dancer.y, 10)).toBeNull();
  });

  it('applyDropBallDancerHits returns null when nothing hit', () => {
    const dancers = createDropBallDancers();
    expect(applyDropBallDancerHits(dancers, 0, 0, 10)).toBeNull();
  });
});
