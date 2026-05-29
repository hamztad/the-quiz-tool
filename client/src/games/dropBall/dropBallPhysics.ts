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

/**
 * Face normal from ball vs. rotated rectangle — uses closest point on the bar,
 * matching the rectangle's angle (same approach that worked before, with stabler face pick).
 */
function getLocalObstacleHitNormal(ball: Matter.Body, obstacle: Matter.Body): Matter.Vector {
  const angle = obstacle.angle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = ball.position.x - obstacle.position.x;
  const dy = ball.position.y - obstacle.position.y;
  const localBall = {
    x: dx * cos + dy * sin,
    y: -dx * sin + dy * cos,
  };

  const localVertices = obstacle.vertices.map((vertex) => {
    const vx = vertex.x - obstacle.position.x;
    const vy = vertex.y - obstacle.position.y;
    return {
      x: vx * cos + vy * sin,
      y: -vx * sin + vy * cos,
    };
  });
  const halfWidth = Math.max(1, Math.max(...localVertices.map((vertex) => Math.abs(vertex.x))));
  const halfHeight = Math.max(1, Math.max(...localVertices.map((vertex) => Math.abs(vertex.y))));

  const closestX = Math.max(-halfWidth, Math.min(halfWidth, localBall.x));
  const closestY = Math.max(-halfHeight, Math.min(halfHeight, localBall.y));
  const separationX = localBall.x - closestX;
  const separationY = localBall.y - closestY;

  let localNormal: Matter.Vector;
  if (Math.abs(separationX) < 0.001 && Math.abs(separationY) < 0.001) {
    const edgeBias =
      Math.abs(localBall.x) / halfWidth > (Math.abs(localBall.y) / halfHeight) * 1.12;
    localNormal = edgeBias
      ? { x: Math.sign(localBall.x) || 1, y: 0 }
      : { x: 0, y: Math.sign(localBall.y) || -1 };
  } else if (Math.abs(separationX) > Math.abs(separationY)) {
    localNormal = { x: Math.sign(separationX) || 1, y: 0 };
  } else {
    localNormal = { x: 0, y: Math.sign(separationY) || -1 };
  }

  const worldNormal = {
    x: localNormal.x * cos - localNormal.y * sin,
    y: localNormal.x * sin + localNormal.y * cos,
  };

  const toBall = { x: dx, y: dy };
  if (dot(worldNormal, toBall) < 0) {
    return { x: -worldNormal.x, y: -worldNormal.y };
  }
  return worldNormal;
}

export function calculateObstacleBounceVelocity(
  ball: Matter.Body,
  obstacle: Matter.Body,
): Matter.Vector {
  const normal = getLocalObstacleHitNormal(ball, obstacle);
  const tangent = { x: -normal.y, y: normal.x };
  const velocity = ball.velocity;
  const speed = Math.max(1, Math.hypot(velocity.x, velocity.y));
  const normalVelocity = dot(velocity, normal);
  const tangentVelocity = dot(velocity, tangent);
  const minAwaySpeed = 4;
  const targetSpeed = Math.max(7, speed * 1.04);
  const awayNormalVelocity =
    normalVelocity < 0
      ? Math.max(-normalVelocity * 1.04, minAwaySpeed)
      : Math.max(normalVelocity, minAwaySpeed * 0.7);
  const preservedTangentVelocity = tangentVelocity * 0.94;
  const raw = {
    x: tangent.x * preservedTangentVelocity + normal.x * awayNormalVelocity,
    y: tangent.y * preservedTangentVelocity + normal.y * awayNormalVelocity,
  };
  const rawSpeed = Math.max(1, Math.hypot(raw.x, raw.y));
  const scale = targetSpeed / rawSpeed;
  return {
    x: raw.x * scale,
    y: raw.y * scale,
  };
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
  if (speed < 2.5) {
    return { x: x * 0.78, y: Math.min(y, 0.4) };
  }
  if (speed < 5.5) {
    return reflectVelocity(ball.velocity, { x: 0, y: -1 }, 0.42);
  }
  return reflectVelocity(ball.velocity, { x: 0, y: -1 }, 0.92);
}
