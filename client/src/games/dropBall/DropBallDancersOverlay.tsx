import type { CSSProperties } from 'react';
import type { DropBallDancerState } from './dropBallDancers';
import {
  DROP_BALL_CANVAS_HEIGHT,
  DROP_BALL_CANVAS_WIDTH,
} from './dropBallDancers';

interface DropBallDancersOverlayProps {
  dancers: DropBallDancerState[];
  musicPlaying: boolean;
  onLaunchComplete: (id: DropBallDancerState['id']) => void;
}

export function DropBallDancersOverlay({
  dancers,
  musicPlaying,
  onLaunchComplete,
}: DropBallDancersOverlayProps) {
  const visible = dancers.filter(
    (dancer) => !dancer.gone && (musicPlaying || dancer.launched),
  );
  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {visible.map((dancer) => {
        const leftPct = (dancer.x / DROP_BALL_CANVAS_WIDTH) * 100;
        const topPct = (dancer.y / DROP_BALL_CANVAS_HEIGHT) * 100;
        const dancing = musicPlaying && !dancer.launched;
        const launching = dancer.launched && dancer.launch;

        return (
          <div
            key={dancer.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          >
            <span
              className={[
                'drop-ball-dancer block text-[clamp(1.85rem,8.5vw,2.85rem)] leading-none select-none drop-shadow-[0_2px_8px_rgba(15,23,42,0.45)]',
                dancing ? `drop-ball-dancer--dance drop-ball-dancer--dance-${dancer.id}` : '',
                launching ? 'drop-ball-dancer--launch' : '',
              ].join(' ')}
              style={
                launching && dancer.launch
                  ? ({
                      '--launch-x': `${dancer.launch.dx}px`,
                      '--launch-y': `${dancer.launch.dy}px`,
                      '--launch-rot': `${dancer.launch.rotation}deg`,
                    } as CSSProperties)
                  : undefined
              }
              onAnimationEnd={() => {
                if (launching) onLaunchComplete(dancer.id);
              }}
            >
              {dancer.emoji}
            </span>
          </div>
        );
      })}
    </div>
  );
}
