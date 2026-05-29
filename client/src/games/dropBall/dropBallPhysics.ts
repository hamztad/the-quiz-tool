import type Matter from 'matter-js';

function dot(a: Matter.Vector, b: Matter.Vector): number {
  return a.x * b.x + a.y * b.y;
}

function normalize(vector: Matter.Vector): Matter.Vector {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function scaleToSpeed(velocity: Matter.Vector, targetSpeed: number): Matter.Vector {
  const speed = Math.hypot(velocity.x, velocity.y) || 1;
  const scale = targetSpeed / speed;
  return { x: velocity.x * scale, y: velocity.y * scale };
}

/** Outward normals for the four faces of a rotated rectangle. */
function getObstacleFaceNormals(ball: Matter.Body, obstacle: Matter.Body): Matter.Vector[] {
  const angle = obstacle.angle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const toBall = {
    x: ball.position.x - obstacle.position.x,
    y: ball.position.y - obstacle.position.y,
  };
  const axes = [
    { x: cos, y: sin },
    { x: -sin, y: cos },
  ];
  const normals: Matter.Vector[] = [];
  for (const axis of axes) {
    const towardBall = dot(toBall, axis) >= 0 ? axis : { x: -axis.x, y: -axis.y };
    normals.push(towardBall);
    normals.push({ x: -towardBall.x, y: -towardBall.y });
  }
  return normals;
}

function pickObstacleNormal(ball: Matter.Body, obstacle: Matter.Body): Matter.Vector {
  const velocity = ball.velocity;
  const candidates = getObstacleFaceNormals(ball, obstacle);
  let best = candidates[0] ?? { x: 0, y: -1 };
  let bestApproach = dot(velocity, best);
  for (const normal of candidates) {
    const approach = dot(velocity, normal);
    if (approach < bestApproach) {
      bestApproach = approach;
      best = normal;
    }
  }
  return normalize(best);
}

export function calculateObstacleBounceVelocity(
  ball: Matter.Body,
  obstacle: Matter.Body,
): Matter.Vector {
  const normal = pickObstacleNormal(ball, obstacle);
  const tangent = { x: -normal.y, y: normal.x };
  const velocity = ball.velocity;
  const speed = Math.max(1, Math.hypot(velocity.x, velocity.y));
  const normalVelocity = dot(velocity, normal);
  const tangentVelocity = dot(velocity, tangent);
  const incidence = Math.min(1, Math.abs(normalVelocity) / speed);
  const grazing = 1 - incidence;

  const minAwaySpeed = 4.2 + grazing * 2.4;
  const restitution = 1.06 + grazing * 0.1;
  const awayNormalVelocity =
    normalVelocity < 0
      ? Math.max(-normalVelocity * restitution, minAwaySpeed)
      : Math.max(normalVelocity, minAwaySpeed * 0.75);

  const tangentKeep = 0.94 + grazing * 0.055;
  const preservedTangentVelocity = tangentVelocity * tangentKeep;
  const raw = {
    x: tangent.x * preservedTangentVelocity + normal.x * awayNormalVelocity,
    y: tangent.y * preservedTangentVelocity + normal.y * awayNormalVelocity,
  };
  const targetSpeed = Math.max(7.2, speed * (1.04 + grazing * 0.04));
  return scaleToSpeed(raw, targetSpeed);
}

export function calculateWallBounceVelocity(
  ball: Matter.Body,
  outwardNormal: Matter.Vector,
): Matter.Vector {
  const normal = normalize(outwardNormal);
  const tangent = { x: -normal.y, y: normal.x };
  const velocity = ball.velocity;
  const speed = Math.max(1, Math.hypot(velocity.x, velocity.y));
  const normalVelocity = dot(velocity, normal);
  const tangentVelocity = dot(velocity, tangent);
  const incidence = Math.min(1, Math.abs(normalVelocity) / speed);
  const grazing = 1 - incidence;

  const wallRestitution = 1.04 + grazing * 0.12;
  const minAwaySpeed = 5 + grazing * 3.5;
  const awayNormalVelocity =
    normalVelocity < 0
      ? Math.max(-normalVelocity * wallRestitution, minAwaySpeed)
      : Math.max(normalVelocity, minAwaySpeed * 0.8);

  const tangentKeep = 0.985 + grazing * 0.012;
  const raw = {
    x: tangent.x * tangentVelocity * tangentKeep + normal.x * awayNormalVelocity,
    y: tangent.y * tangentVelocity * tangentKeep + normal.y * awayNormalVelocity,
  };
  const targetSpeed = Math.max(6.8, speed * (1.02 + grazing * 0.05));
  return scaleToSpeed(raw, targetSpeed);
}

export function calculateFloorBounceVelocity(ball: Matter.Body): Matter.Vector {
  const velocity = ball.velocity;
  const speed = Math.max(1, Math.hypot(velocity.x, velocity.y));
  const upward = Math.max(-velocity.y * 1.1, 5.2);
  const horizontal = velocity.x * 0.98;
  return scaleToSpeed({ x: horizontal, y: -upward }, Math.max(6.5, speed * 1.03));
}
