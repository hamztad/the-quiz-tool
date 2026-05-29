import type Matter from 'matter-js';

function dot(a: Matter.Vector, b: Matter.Vector): number {
  return a.x * b.x + a.y * b.y;
}

function normalize(vector: Matter.Vector): Matter.Vector {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function reflectVelocity(
  velocity: Matter.Vector,
  outwardNormal: Matter.Vector,
  restitution: number,
): Matter.Vector {
  const normal = normalize(outwardNormal);
  const normalSpeed = dot(velocity, normal);
  if (normalSpeed >= 0) {
    return { x: velocity.x, y: velocity.y };
  }
  const tangentX = velocity.x - normal.x * normalSpeed;
  const tangentY = velocity.y - normal.y * normalSpeed;
  const reflectedNormal = -normalSpeed * restitution;
  return {
    x: tangentX + normal.x * reflectedNormal,
    y: tangentY + normal.y * reflectedNormal,
  };
}

/** Matter normal points from bodyA → bodyB; return normal pointing away from obstacle onto ball. */
export function obstacleNormalFromCollision(
  pair: Matter.Pair,
  ball: Matter.Body,
  obstacle: Matter.Body,
): Matter.Vector | null {
  const collision = pair.collision;
  if (!collision.normal || collision.depth < 0.15) return null;

  const { normal } = collision;
  if (pair.bodyA === ball && pair.bodyB === obstacle) {
    return { x: -normal.x, y: -normal.y };
  }
  if (pair.bodyB === ball && pair.bodyA === obstacle) {
    return { x: normal.x, y: normal.y };
  }
  return null;
}

/** Face normal from ball position in obstacle local space — matches drawn rectangle angle. */
export function geometryObstacleNormal(ball: Matter.Body, obstacle: Matter.Body): Matter.Vector {
  const angle = obstacle.angle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = ball.position.x - obstacle.position.x;
  const dy = ball.position.y - obstacle.position.y;
  const localBall = {
    x: dx * cos + dy * sin,
    y: -dx * sin + dy * cos,
  };

  const halfWidth = Math.max(obstacle.bounds.max.x - obstacle.bounds.min.x, 1) * 0.5;
  const halfHeight = Math.max(obstacle.bounds.max.y - obstacle.bounds.min.y, 1) * 0.5;
  const edgeBias =
    Math.abs(localBall.x) / halfWidth > (Math.abs(localBall.y) / halfHeight) * 1.08;
  const localNormal = edgeBias
    ? { x: Math.sign(localBall.x) || 1, y: 0 }
    : { x: 0, y: Math.sign(localBall.y) || -1 };

  return normalize({
    x: localNormal.x * cos - localNormal.y * sin,
    y: localNormal.x * sin + localNormal.y * cos,
  });
}

export function resolveObstacleNormal(
  pair: Matter.Pair,
  ball: Matter.Body,
  obstacle: Matter.Body,
): Matter.Vector {
  const fromCollision = obstacleNormalFromCollision(pair, ball, obstacle);
  const fromGeometry = geometryObstacleNormal(ball, obstacle);
  if (!fromCollision) return fromGeometry;

  const blended = normalize({
    x: fromCollision.x * 0.55 + fromGeometry.x * 0.45,
    y: fromCollision.y * 0.55 + fromGeometry.y * 0.45,
  });
  if (dot(ball.velocity, blended) > 0.05) {
    return { x: -blended.x, y: -blended.y };
  }
  return blended;
}

export function calculateObstacleBounceVelocity(
  ball: Matter.Body,
  normal: Matter.Vector,
): Matter.Vector {
  const speed = Math.max(0.5, Math.hypot(ball.velocity.x, ball.velocity.y));
  const incidence = Math.min(1, Math.abs(dot(ball.velocity, normal)) / speed);
  const grazing = 1 - incidence;
  const restitution = 1.03 + grazing * 0.05;
  return reflectVelocity(ball.velocity, normal, restitution);
}

export function calculateWallBounceVelocity(
  ball: Matter.Body,
  outwardNormal: Matter.Vector,
): Matter.Vector {
  const speed = Math.max(0.5, Math.hypot(ball.velocity.x, ball.velocity.y));
  const incidence = Math.min(1, Math.abs(dot(ball.velocity, outwardNormal)) / speed);
  const grazing = 1 - incidence;
  if (grazing < 0.55) {
    return reflectVelocity(ball.velocity, outwardNormal, 0.9);
  }
  return reflectVelocity(ball.velocity, outwardNormal, 0.93 + grazing * 0.05);
}

export function calculateFloorBounceVelocity(ball: Matter.Body): Matter.Vector {
  const { x, y } = ball.velocity;
  const speed = Math.hypot(x, y);
  if (speed < 2.2) {
    return { x: x * 0.82, y: Math.min(y, 0.6) };
  }
  if (speed < 5) {
    return reflectVelocity(ball.velocity, { x: 0, y: -1 }, 0.55);
  }
  return reflectVelocity(ball.velocity, { x: 0, y: -1 }, 1.04);
}
