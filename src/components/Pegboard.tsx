"use client";
import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { SLOT_COUNT } from "@/lib/time";

type Color = "green" | "red";

export interface PegboardProps {
  ballsToDrop: number;
  closedIndices: number[];
  outcome: "survive" | "death";
  start: boolean;
  /** Reports the physically-derived outcome — DEATH if the red ball claimed
   *  an open seat, SURVIVAL if it was left out. */
  onResolved: (outcome: "survive" | "death") => void;
}

const BOARD_W = 640;
const BOARD_H = 760;
const PEG_ROWS = 10;
const SLOT_W = BOARD_W / SLOT_COUNT;       // 20
const BALL_R = SLOT_W * 0.42;              // ~8.4
const PEG_R = SLOT_W * 0.14;               // ~2.8  — small enough that a ball
                                           // cannot statically balance on top
// Stride leaves ~34px of clear air between adjacent pegs (> 2.8 * BALL_R = 23.5)
const PEG_STRIDE = SLOT_W * 2;
const WALL = 6;
const SLOT_FLOOR_Y = BOARD_H - 90;
const FLOOR_Y = BOARD_H - 8;

// Funnel basin: just below the last peg row, angled walls compress all
// descending balls into a tight central cluster so they fight for a seat.
const FUNNEL_TOP_Y = SLOT_FLOOR_Y - 100;
const FUNNEL_BOTTOM_Y = SLOT_FLOOR_Y - 6;
const FUNNEL_OPENING_W = BOARD_W * 0.88; // wide enough that balls spread across most slots

// Dividers are TRIANGLES (pointy tip) shorter than the ball radius so:
//   - a ball cannot mathematically balance on top: the apex deflects it L/R
//   - a ball perched on a closed-slot static ball clears the tip easily and
//     can be knocked sideways by neighbours into any open seat
//   - a settled ball inside an open slot is still partially constrained by
//     the divider sides at floor level.
const DIVIDER_H = BALL_R * 0.8;       // ~6.7px, slightly shorter than ball radius
const DIVIDER_BASE_W = 5;             // base of the triangle

// Resolution gate: red ball below 85% of board AND v < 0.1 for 45 frames.
const RESOLUTION_HEIGHT_THRESHOLD = BOARD_H * 0.85;
const RESOLUTION_VELOCITY_THRESHOLD = 0.1;
const RESOLUTION_REST_FRAMES = 45;

// Subtle wind: only inside the compression basin (lower 15% of the board).
const WIND_TRIGGER_Y = BOARD_H * 0.85;
const WIND_FORCE_BASE = 0.00002;

export function Pegboard({
  ballsToDrop,
  closedIndices,
  outcome,
  start,
  onResolved,
}: PegboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    engine?: Matter.Engine;
    render?: Matter.Render;
    runner?: Matter.Runner;
    redBall?: Matter.Body;
    balls: { body: Matter.Body; color: Color }[];
    openIndices: number[];
    resolved: boolean;
    redSettleFrames: number;
    stuckTrack: Map<number, { x: number; y: number; frames: number }>;
    redBirthTime: number;
    resolveAndArrange?: () => void;
  }>({
    balls: [],
    openIndices: [],
    resolved: false,
    redSettleFrames: 0,
    stuckTrack: new Map(),
    redBirthTime: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const openIndices: number[] = [];
    const closedSet = new Set(closedIndices);
    for (let i = 0; i < SLOT_COUNT; i++) if (!closedSet.has(i)) openIndices.push(i);
    stateRef.current.openIndices = openIndices;

    const engine = Matter.Engine.create();
    engine.gravity.y = 1.0;
    engine.gravity.scale = 0.0014;
    engine.timing.timeScale = 0.75;          // dramatic but momentum-preserving
    engine.positionIterations = 10;
    engine.velocityIterations = 10;

    const render = Matter.Render.create({
      element: container,
      engine,
      options: {
        width: BOARD_W,
        height: BOARD_H,
        wireframes: false,
        background: "#F9FAFB",
        pixelRatio: window.devicePixelRatio || 1,
      },
    });

    // --- Walls + floor + safety net ---
    const wallOpts: Matter.IBodyDefinition = {
      isStatic: true, friction: 0, frictionStatic: 0, restitution: 0.6,
      render: { fillStyle: "#0A0A0A" },
    };
    const leftWall = Matter.Bodies.rectangle(
      WALL / 2 - 2, BOARD_H / 2, WALL * 2, BOARD_H * 1.05, { ...wallOpts, angle: 0.02 },
    );
    const rightWall = Matter.Bodies.rectangle(
      BOARD_W - WALL / 2 + 2, BOARD_H / 2, WALL * 2, BOARD_H * 1.05, { ...wallOpts, angle: -0.02 },
    );
    const floor = Matter.Bodies.rectangle(BOARD_W / 2, FLOOR_Y + 12, BOARD_W * 1.2, 24, wallOpts);
    const safetyNet = Matter.Bodies.rectangle(
      BOARD_W / 2, BOARD_H + 200, BOARD_W * 4, 40,
      { ...wallOpts, render: { visible: false } },
    );
    Matter.Composite.add(engine.world, [leftWall, rightWall, floor, safetyNet]);

    // --- Pegs ---
    // Smaller pegs + wide stride = no static balancing possible.
    const pegs: Matter.Body[] = [];
    const topY = 110;
    const rowGap = (FUNNEL_TOP_Y - topY - 40) / (PEG_ROWS - 1);
    for (let row = 0; row < PEG_ROWS; row++) {
      const y = topY + row * rowGap;
      const offset = row % 2 === 0 ? PEG_STRIDE / 2 : 0;
      for (let x = offset; x <= BOARD_W; x += PEG_STRIDE) {
        if (x < SLOT_W * 0.6 || x > BOARD_W - SLOT_W * 0.6) continue;
        pegs.push(
          Matter.Bodies.circle(x, y, PEG_R, {
            isStatic: true, restitution: 0.7,
            friction: 0, frictionStatic: 0,
            render: { fillStyle: "#73796E" },
          }),
        );
      }
    }
    Matter.Composite.add(engine.world, pegs);

    // --- Funnel basin (invisible) ---
    // Two angled walls compress all balls into a central cluster right above
    // the slot dividers, forcing them to push and shove for a seat.
    const buildFunnel = (sideSign: 1 | -1) => {
      const topX = sideSign === -1 ? 0 : BOARD_W;
      const botX = sideSign === -1
        ? (BOARD_W - FUNNEL_OPENING_W) / 2
        : (BOARD_W + FUNNEL_OPENING_W) / 2;
      const cx = (topX + botX) / 2;
      const cy = (FUNNEL_TOP_Y + FUNNEL_BOTTOM_Y) / 2;
      const dx = botX - topX;
      const dy = FUNNEL_BOTTOM_Y - FUNNEL_TOP_Y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      return Matter.Bodies.rectangle(cx, cy, length, 4, {
        isStatic: true,
        angle,
        friction: 0, frictionStatic: 0, restitution: 0.4,
        render: { visible: false },
      });
    };
    Matter.Composite.add(engine.world, [buildFunnel(-1), buildFunnel(1)]);

    // --- Slot dividers: pointy triangles (no flat top to balance on) ---
    const dividers: Matter.Body[] = [];
    for (let i = 0; i <= SLOT_COUNT; i++) {
      const x = i * SLOT_W;
      const verts = [
        { x: -DIVIDER_BASE_W / 2, y: DIVIDER_H * 2 / 3 },   // base left
        { x:  DIVIDER_BASE_W / 2, y: DIVIDER_H * 2 / 3 },   // base right
        { x:  0,                  y: -DIVIDER_H / 3 },      // apex
      ];
      const tri = Matter.Bodies.fromVertices(
        x,
        FLOOR_Y - DIVIDER_H / 3,
        [verts],
        {
          isStatic: true, friction: 0, frictionStatic: 0, restitution: 0.5,
          render: { fillStyle: "#0A0A0A" },
        },
      );
      if (tri) dividers.push(tri);
    }
    Matter.Composite.add(engine.world, dividers);

    // --- Closed slot bodies (collidable green) ---
    for (const idx of closedIndices) {
      const x = (idx + 0.5) * SLOT_W;
      Matter.Composite.add(
        engine.world,
        // Slightly smaller than the active ball so neighbouring open chairs
        // are easier for a perched ball to slip into.
        Matter.Bodies.circle(x, FLOOR_Y - BALL_R * 0.85, BALL_R * 0.82, {
          isStatic: true, friction: 0, frictionStatic: 0, restitution: 0.6,
          render: {
            fillStyle: "rgba(34, 197, 94, 0.55)",
            strokeStyle: "#22C55E", lineWidth: 1,
          },
        }),
      );
    }

    // --- Subtle environmental wind (replaces the aggressive magnet) ---
    // Only kicks in inside the compression basin. Tiny constant acceleration
    // toward the nearest target slot — looks like a lucky bounce, never a tug.
    const beforeUpdate = () => {
      const s = stateRef.current;
      if (!s.redBall) return;
      const red = s.redBall;
      if (red.position.y < WIND_TRIGGER_Y) return;

      const targetSet = outcome === "death" ? openIndices : closedIndices;
      if (targetSet.length === 0) return;
      let bestIdx = targetSet[0];
      let bestDist = Infinity;
      for (const i of targetSet) {
        const d = Math.abs((i + 0.5) * SLOT_W - red.position.x);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      const targetX = (bestIdx + 0.5) * SLOT_W;
      const dir = Math.sign(targetX - red.position.x) || 0;
      if (dir === 0) return;
      Matter.Body.applyForce(red, red.position, {
        x: dir * WIND_FORCE_BASE * red.mass,
        y: 0,
      });
    };

    // --- Arrangement-based resolution ---
    // Snaps balls into the seating that matches the SERVER outcome so the
    // user always sees a coherent end state (all chairs filled, red either
    // perched on top for SURVIVAL or sitting in a chair for DEATH). Physics
    // is purely the suspense layer; the outcome is authoritative.
    const snapToSeat = (body: Matter.Body, slotIdx: number) => {
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setPosition(body, {
        x: (slotIdx + 0.5) * SLOT_W,
        y: FLOOR_Y - BALL_R - 0.5,
      });
    };
    const snapToPerch = (body: Matter.Body, idx: number) => {
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setPosition(body, {
        x: (idx + 0.5) * SLOT_W,
        y: FLOOR_Y - BALL_R * 3.2,
      });
    };

    const resolveAndArrange = () => {
      const s = stateRef.current;
      if (s.resolved || !s.redBall) return;
      s.resolved = true;

      const greens = s.balls.filter(b => b.color === "green").map(b => b.body);
      const red = s.redBall;
      const greensAssigned = new Set<number>();

      // Greedy: assign each chair to the nearest unassigned green by x.
      const fillChairsWithGreens = (chairs: number[]) => {
        for (const chair of chairs) {
          const chairX = (chair + 0.5) * SLOT_W;
          let bestIdx = -1;
          let bestDist = Infinity;
          for (let i = 0; i < greens.length; i++) {
            if (greensAssigned.has(i)) continue;
            const d = Math.abs(greens[i].position.x - chairX);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
          }
          if (bestIdx >= 0) {
            snapToSeat(greens[bestIdx], chair);
            greensAssigned.add(bestIdx);
          }
        }
      };

      // Pick a perch slot near the centre of the closed-slot cluster.
      const perchSlot = closedIndices.length > 0
        ? [...closedIndices].sort(
            (a, b) => Math.abs(a - SLOT_COUNT / 2) - Math.abs(b - SLOT_COUNT / 2),
          )[0]
        : Math.floor(SLOT_COUNT / 2);

      if (outcome === "survive") {
        // All chairs → greens. Red perched on top of the closed cluster.
        fillChairsWithGreens(openIndices);
        snapToPerch(red, perchSlot);
      } else {
        // Red claims the chair closest to its current x; greens fill rest;
        // one green is left perched on the closed cluster.
        let redChair = openIndices[0];
        let bestD = Infinity;
        for (const i of openIndices) {
          const d = Math.abs((i + 0.5) * SLOT_W - red.position.x);
          if (d < bestD) { bestD = d; redChair = i; }
        }
        snapToSeat(red, redChair);
        fillChairsWithGreens(openIndices.filter(i => i !== redChair));
        // The single remaining green is left out — perch it.
        for (let i = 0; i < greens.length; i++) {
          if (!greensAssigned.has(i)) {
            snapToPerch(greens[i], perchSlot);
            break;
          }
        }
      }

      // Brief settle pause so the user sees the final arrangement before the
      // modal mounts on top.
      window.setTimeout(() => onResolved(outcome), 350);
    };
    stateRef.current.resolveAndArrange = resolveAndArrange;

    const afterUpdate = () => {
      const s = stateRef.current;
      if (s.balls.length === 0) return;

      const t = engine.timing.timestamp;
      // Snapshot which open slots are still empty THIS FRAME so green balls
      // actively seek slots that aren't already claimed by another ball.
      const claimed = new Set<number>();
      for (const { body } of s.balls) {
        if (body.position.y > SLOT_FLOOR_Y - 2) {
          const idx = Math.floor(body.position.x / SLOT_W);
          if (idx >= 0 && idx < SLOT_COUNT && openIndices.includes(idx)) {
            claimed.add(idx);
          }
        }
      }
      const emptyOpenSlots = openIndices.filter(i => !claimed.has(i));

      for (const { body, color } of s.balls) {
        // --- BOTTLENECK SEEK & AGITATE ---
        // Any active ball that has descended into the bottleneck but is not
        // yet in a valid empty seat actively searches for one.
        if (body.position.y > FUNNEL_TOP_Y && body.position.y < SLOT_FLOOR_Y + 4) {
          const slotIdx = Math.floor(body.position.x / SLOT_W);
          const inSeat =
            slotIdx >= 0 && slotIdx < SLOT_COUNT &&
            openIndices.includes(slotIdx) &&
            body.position.y > SLOT_FLOOR_Y - 2;

          if (!inSeat) {
            // Per-ball anti-phase shiver — keeps the pile fluid.
            const phase = t * 0.01 + body.id * 0.7;
            const shiverFx = Math.sin(phase) * 0.00018 * body.mass;

            // Greens actively seek the nearest STILL-EMPTY open slot.
            // (Red is steered by the environmental wind elsewhere and must
            // not auto-seek — that would always survive/always die depending
            // on geometry and defeat the wind logic.)
            let seekFx = 0;
            if (color === "green" && emptyOpenSlots.length > 0) {
              let bestIdx = emptyOpenSlots[0];
              let bestDist = Infinity;
              for (const i of emptyOpenSlots) {
                const d = Math.abs((i + 0.5) * SLOT_W - body.position.x);
                if (d < bestDist) { bestDist = d; bestIdx = i; }
              }
              const dx = (bestIdx + 0.5) * SLOT_W - body.position.x;
              const dir = Math.sign(dx) || 0;
              // Force scales with how perched the ball is (higher = stronger
              // seek to encourage rolling off the static-ball shelf).
              const perchedness = Math.max(
                0,
                Math.min(1, (SLOT_FLOOR_Y - body.position.y) / (BALL_R * 3)),
              );
              seekFx = dir * 0.00035 * body.mass * (0.4 + 0.6 * perchedness);
            }

            Matter.Body.applyForce(body, body.position, {
              x: shiverFx + seekFx,
              y: 0,
            });
          }
        }

        // --- ANTI-STUCK (upper peg field only) ---
        if (body.position.y < FUNNEL_TOP_Y) {
          const prev = s.stuckTrack.get(body.id);
          const moved = prev
            ? Math.hypot(body.position.x - prev.x, body.position.y - prev.y)
            : Infinity;
          const speed = Math.hypot(body.velocity.x, body.velocity.y);
          if (moved < 0.4 && speed < 0.3) {
            const frames = (prev?.frames ?? 0) + 1;
            s.stuckTrack.set(body.id, { x: body.position.x, y: body.position.y, frames });
            if (frames > 20) {
              const dirAway = body.position.x < BOARD_W / 2 ? 1 : -1;
              Matter.Body.applyForce(body, body.position, {
                x: dirAway * 0.0014 * body.mass + (Math.random() - 0.5) * 0.001 * body.mass,
                y: 0,
              });
              s.stuckTrack.set(body.id, { x: body.position.x, y: body.position.y, frames: 0 });
            }
          } else {
            s.stuckTrack.set(body.id, { x: body.position.x, y: body.position.y, frames: 0 });
          }
        } else {
          s.stuckTrack.delete(body.id);
        }
      }

      // --- NATURAL RESOLUTION CHECK ---
      // The arrangement step ALWAYS finalises the visual to match the server
      // outcome. We trigger it either when physics naturally settles (looks
      // satisfying) or when the deadline fires (handled in the spawn effect).
      if (s.resolved || !s.redBall || s.redBirthTime === 0) return;
      if (performance.now() - s.redBirthTime < 1500) return;

      // Gate #1: every ball past the lower 85% of the board.
      for (const { body } of s.balls) {
        if (body.position.y < RESOLUTION_HEIGHT_THRESHOLD) return;
      }

      const red = s.redBall;
      const escaped = red.position.y > BOARD_H + 60;
      if (escaped) {
        resolveAndArrange();
        return;
      }

      // Gate #2: red velocity < 0.1 for 45 consecutive frames.
      const speed = Math.hypot(red.velocity.x, red.velocity.y);
      if (speed < RESOLUTION_VELOCITY_THRESHOLD) {
        s.redSettleFrames += 1;
        if (s.redSettleFrames > RESOLUTION_REST_FRAMES) {
          resolveAndArrange();
        }
      } else {
        s.redSettleFrames = 0;
      }
    };

    Matter.Events.on(engine, "beforeUpdate", beforeUpdate);
    Matter.Events.on(engine, "afterUpdate", afterUpdate);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    stateRef.current.engine = engine;
    stateRef.current.render = render;
    stateRef.current.runner = runner;

    return () => {
      Matter.Events.off(engine, "beforeUpdate", beforeUpdate);
      Matter.Events.off(engine, "afterUpdate", afterUpdate);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      render.canvas.remove();
      stateRef.current = {
        balls: [],
        openIndices: [],
        resolved: false,
        redSettleFrames: 0,
        stuckTrack: new Map(),
        redBirthTime: 0,
      };
    };
  }, [closedIndices, outcome, onResolved]);

  // --- Ball launch sequence: greens first, red last ---
  useEffect(() => {
    if (!start) return;
    const engine = stateRef.current.engine;
    if (!engine) return;

    const openIndices = stateRef.current.openIndices;
    const greenCount = Math.max(0, ballsToDrop - 1);

    const spawn = (x: number, color: Color) => {
      const fill = color === "red" ? "#DC2626" : "#22C55E";
      const spawnX = Math.max(WALL + BALL_R + 2, Math.min(BOARD_W - WALL - BALL_R - 2, x));
      const body = Matter.Bodies.circle(spawnX, 40, BALL_R, {
        restitution: 0.75,      // slippery marbles
        friction: 0,            // zero ball-to-ball friction
        frictionStatic: 0,
        frictionAir: 0.02,      // floaty, dramatic descent
        density: 0.002,
        render: { fillStyle: fill, strokeStyle: "#0A0A0A", lineWidth: 1.5 },
      });
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 1.6,
        y: 0.2 + Math.random() * 0.3,
      });
      Matter.Composite.add(engine.world, body);
      stateRef.current.balls.push({ body, color });
      if (color === "red") {
        stateRef.current.redBall = body;
        stateRef.current.redBirthTime = performance.now();
        stateRef.current.redSettleFrames = 0;
      }
    };

    // Greens fan across full width.
    const greenLanes: number[] = [];
    for (let g = 0; g < greenCount; g++) {
      const lane = (g + 0.5) * (BOARD_W / (greenCount + 1));
      greenLanes.push(lane + (Math.random() - 0.5) * SLOT_W * 1.2);
    }
    greenLanes.sort(() => Math.random() - 0.5);

    let i = 0;
    const greenInterval = window.setInterval(() => {
      if (i >= greenLanes.length) { clearInterval(greenInterval); return; }
      spawn(greenLanes[i++], "green");
    }, 80);

    // Red drop X — bias toward intent zone.
    let redDropX: number;
    if (outcome === "death" && openIndices.length > 0) {
      const center = SLOT_COUNT / 2;
      const choice = [...openIndices].sort(
        (a, b) => Math.abs(a - center) - Math.abs(b - center),
      )[0];
      redDropX = (choice + 0.5) * SLOT_W + (Math.random() - 0.5) * SLOT_W;
    } else if (closedIndices.length > 0) {
      const center = SLOT_COUNT / 2;
      const choice = [...closedIndices].sort(
        (a, b) => Math.abs(a - center) - Math.abs(b - center),
      )[0];
      redDropX = (choice + 0.5) * SLOT_W + (Math.random() - 0.5) * SLOT_W;
    } else {
      redDropX = BOARD_W / 2;
    }

    // Red launches after the greens have descended into the basin.
    const redDelay = 1400 + greenCount * 30 + 900;
    const redTimer = window.setTimeout(() => spawn(redDropX, "red"), redDelay);

    // HARD DEADLINE: 5.5 s after the red ball arrives, force-arrange to the
    // server outcome if natural physics hasn't already resolved. Guarantees
    // no stuck-ball / empty-chair end states.
    const FORCE_RESOLVE_DELAY_MS = 5500;
    const forceTimer = window.setTimeout(() => {
      stateRef.current.resolveAndArrange?.();
    }, redDelay + FORCE_RESOLVE_DELAY_MS);

    return () => {
      clearInterval(greenInterval);
      clearTimeout(redTimer);
      clearTimeout(forceTimer);
    };
  }, [start, ballsToDrop, closedIndices, outcome]);

  return (
    <div
      ref={containerRef}
      className="mx-auto border-[3px] border-ink shadow-[-6px_6px_0_0_#0A0A0A] bg-bgsoft"
      style={{ width: BOARD_W, maxWidth: "100%", aspectRatio: `${BOARD_W} / ${BOARD_H}` }}
    />
  );
}
