// "This Dolphin Swims Through a Forest" — pink river dolphin / boto (Inia geoffrensis) low-poly short with the
// 2026-10-18 analytics rules (hook card at frame 0, name label, loop ending, on-screen CTA). Scenes follow
// shorts/en/pink-river-dolphin-forest.yaml. Facts: National Geographic (package sources).
import { useMemo } from "react";
import * as THREE from "three";
import { ForestBack, JungleBackdrop, JungleLights, Leaves, Trunk } from "../env/Jungle";
import { GodRays, RiverBackdrop, Riverbed, RiverLights, Silt, Surface } from "../env/River";
import { clamp01, glide, lerp } from "../lib/lowpoly";
import { Pop, Shot, ShortShell } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Fish, RiverDolphin } from "../models/RiverDolphin";

const KEYWORDS = ["forest", "Amazon", "floods", "pink", "trees", "neck", "ninety", "degrees", "fish", "scars", "fights", "rises"];

// flooded trunks (riverbed → above the surface). The layout repeats every PERIOD along -z, so only the copies near the
// dolphin are drawn and the forest looks endless (shifting by a whole period is invisible).
const PERIOD = 8;
const TRUNKS: [number, number][] = [[-0.9, -1], [0.9, -3], [-0.9, -5], [0.9, -7], [-2.2, -2], [2.3, -4.5], [-2.4, -6.5], [2.1, -8.5]];
const FloodedForest: React.FC<{ near?: number }> = ({ near = 0 }) => {
  const base = Math.floor(-near / PERIOD);
  return (
    <>
      {[-1, 0, 1, 2].flatMap((p) =>
        TRUNKS.map(([x, z], i) => {
          const zz = z - (base + p) * PERIOD;
          return (
            <group key={`${p}-${i}`}>
              <Trunk x={x} z={zz} r={0.22 + (i % 3) * 0.05} y0={-2.3} y1={6} seed={i + 1} />
              {[0, 1, 2].map((k) => (
                <mesh key={k} position={[x + Math.cos(k * 2.1 + i) * 0.3, -2.0, zz + Math.sin(k * 2.1 + i) * 0.3]}
                  rotation={[Math.sin(k * 2.1 + i) * 0.6, 0, -Math.cos(k * 2.1 + i) * 0.6]}>
                  <cylinderGeometry args={[0.04, 0.08, 0.7, 5]} />
                  <meshStandardMaterial color="#4a3628" flatShading />
                </mesh>
              ))}
            </group>
          );
        }),
      )}
      <group position={[0, 0, near]}>
        <Riverbed y={-2.3} />
      </group>
    </>
  );
};

const under = (t: number, light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <RiverBackdrop />,
  world: (
    <>
      <RiverLights light={light} />
      <GodRays t={t} />
      <Silt t={t} count={70} spread={7} />
      <Surface t={t} y={3.2} />
    </>
  ),
});

// slalom path between the trunks (moving toward -z): x swings to the free side of each trunk
const path = (d: number) => {
  const z = 1.5 - d;
  const x = 0.6 * Math.cos((Math.PI / 2) * (z + 1));
  const dxdd = 0.6 * (Math.PI / 2) * Math.sin((Math.PI / 2) * (z + 1)); // dx/dd = -dx/dz
  return { pos: new THREE.Vector3(x, -0.6, z), yaw: Math.atan2(dxdd, -1), bank: -dxdd * 0.25 };
};

const Boto: React.FC<{ t: number; d: number; pink?: number; neck?: number; scars?: number }> = ({ t, d, pink = 1, neck = 0, scars = 0 }) => {
  const { pos, yaw, bank } = path(d);
  return (
    <group position={pos.toArray()} rotation={[0, yaw, bank]}>
      <RiverDolphin t={t} pink={pink} neck={neck} scars={scars} />
    </group>
  );
};

// above the water: the jungle flooding (water plane rises around the trunks)
const FloodAbove: React.FC<{ t: number; level: number }> = ({ t, level }) => {
  const water = useMemo(() => new THREE.PlaneGeometry(40, 40, 30, 30).toNonIndexed(), []);
  const pos = water.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 1.2 + t) * 0.04 + Math.cos(pos.getY(i) + t * 0.8) * 0.04);
  pos.needsUpdate = true;
  water.computeVertexNormals();
  return (
    <>
      {TRUNKS.map(([x, z], i) => (
        <group key={i}>
          <Trunk x={x} z={z} r={0.22 + (i % 3) * 0.05} y0={-2.3} y1={6} seed={i + 1} />
          <Leaves pos={[x, 5.5 + (i % 2), z]} size={1.6} seed={i + 40} />
        </group>
      ))}
      <mesh geometry={water} position={[0, level, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#8a7a4a" flatShading transparent opacity={0.92} roughness={0.3} />
      </mesh>
      <mesh position={[0, -2.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#4a3a24" />
      </mesh>
      <ForestBack z={-14} />
    </>
  );
};

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const d = t * ((3 * PERIOD) / tl.total); // 3 whole forest periods: the last frame matches frame 0 (loop)

  switch (scene.visual) {
    case "hook": {
      // weaving between flooded trunks, camera chasing from behind-above
      const { pos } = path(d);
      const sub = s > D * 0.55;
      return {
        ...under(t),
        cam: sub ? { pos: [pos.x + 3.4, pos.y + 0.5, pos.z - 2.6], look: [pos.x, pos.y, pos.z] } : { pos: [pos.x * 0.3, pos.y + 1.9, pos.z + 5.2], look: [pos.x, pos.y, pos.z - 1.0] },
        body: (
          <>
            <Boto t={t} d={d} />
            <FloodedForest near={pos.z} />
          </>
        ),
      };
    }
    case "flood": {
      // above the water: the river rises into the jungle
      const level = glide(s, 0, D, -1.8, 0.3);
      return {
        bg: <JungleBackdrop time="day" />,
        world: <JungleLights time="day" fogNear={8} fogFar={30} />,
        cam: { pos: [3.0, 3.8, 7.0], look: [0, 1.0, -4] },
        body: <FloodAbove t={t} level={level} />,
        overlay: <Pop t={t} at={w(1, 5)} size={110} color="#9fdcff">FLOODED FOREST</Pop>,
      };
    }
    case "trees": {
      const { pos } = path(d);
      return {
        ...under(t),
        cam: { pos: [pos.x - 4.2, pos.y + 0.8, pos.z + 2.6], look: [pos.x, pos.y, pos.z - 0.6] },
        body: (
          <>
            <Boto t={t} d={d} />
            <FloodedForest near={pos.z} />
          </>
        ),
      };
    }
    case "neck": {
      // close on the head: the neck flexes (unfused vertebrae)
      const { pos } = path(d);
      return {
        ...under(t),
        cam: { pos: [pos.x + 3.0, pos.y + 0.6, pos.z - 1.0], look: [pos.x, pos.y, pos.z - 0.9] },
        body: (
          <>
            <Boto t={t} d={d} neck={Math.sin(s * 3) * 0.35} />
            <FloodedForest near={pos.z} />
          </>
        ),
        overlay: <Pop t={t} at={w(3, 1)} size={92} color="#ffd34d">FLEXIBLE NECK</Pop>,
      };
    }
    case "bend": {
      // seen from above: the head bends to ~90° on "ninety"
      const k = glide(t, w(4, 6) - 0.2, w(4, 7) + 0.3, 0, Math.PI / 2 - 0.1);
      return {
        ...under(t),
        cam: { pos: [0.1, 2.8, -0.9], look: [0, -0.6, -1.0] },
        body: (
          <>
            <group position={[0, -0.6, -1.0]} rotation={[0, Math.PI, 0]}>
              <RiverDolphin t={t} neck={k} swim={0.3} />
            </group>
            <Riverbed y={-2.3} />
          </>
        ),
        overlay: <Pop t={t} at={w(4, 7)} size={150} color="#ffd34d">90°</Pop>,
      };
    }
    case "hunt": {
      // twists around a trunk and snaps a fish
      const ang = glide(s, 0, D * 0.8, 0, Math.PI * 1.2);
      const R = 0.75;
      const cx = 0.9;
      const cz = -3;
      const dp = new THREE.Vector3(cx + Math.cos(ang) * R, -0.5, cz + Math.sin(ang) * R);
      const caught = t > w(5, 10);
      return {
        ...under(t),
        cam: { pos: [cx + 3.8, 0.8, cz + 2.4], look: [cx, -0.5, cz] },
        body: (
          <>
            <group position={dp.toArray()} rotation={[0, -ang, 0.35]}>
              <RiverDolphin t={t} neck={-0.5} />
            </group>
            {!caught && (
              <group position={[cx + Math.cos(Math.PI * 1.25) * R, -0.45, cz + Math.sin(Math.PI * 1.25) * R]} rotation={[0, 1, 0]}>
                <Fish t={t} />
              </group>
            )}
            <FloodedForest />
          </>
        ),
        overlay: <Pop t={t} at={w(5, 10)} size={120} color="#ffd34d">CAUGHT!</Pop>,
      };
    }
    case "pink": {
      // the big question: why pink? (slow turn of a bright pink male)
      return {
        ...under(t, 1.15),
        cam: { pos: [4.0, 0.4, 2.2], look: [0, -0.5, 0] },
        body: (
          <>
            <group position={[0, -0.6, 0]} rotation={[0, s * 0.6, 0]}>
              <RiverDolphin t={t} />
            </group>
            <FloodedForest />
          </>
        ),
        overlay: <Pop t={t} at={w(6, 2)} size={150} color="#ff8fb0">PINK?</Pop>,
      };
    }
    case "scars": {
      // close on the back: pale scratch scars appear
      return {
        ...under(t, 1.15),
        cam: { pos: [1.7, 1.9, 1.6], look: [0, -0.5, -0.1] },
        body: (
          <>
            <group position={[0, -0.6, 0]} rotation={[0, 0.3, 0]}>
              <RiverDolphin t={t} scars={glide(s, 0.2, D * 0.6, 0, 1)} />
            </group>
            <Riverbed y={-2.3} />
          </>
        ),
        overlay: <Pop t={t} at={w(7, 5)} size={120} color="#ffe4ea">SCARS</Pop>,
      };
    }
    case "fight": {
      // two males bump and tussle (rough play)
      const bump = Math.max(0, Math.sin(s * 3.2)) ** 3;
      return {
        ...under(t),
        cam: { pos: [0, 0.6, 5.8], look: [0, -0.5, 0] },
        body: (
          <>
            <group position={[-0.55 + bump * 0.18, -0.55, 0]} rotation={[0, Math.PI / 2 + 0.2, 0.2]} scale={0.85}>
              <RiverDolphin t={t} scars={1} />
            </group>
            <group position={[0.55 - bump * 0.18, -0.6, -0.1]} rotation={[0, -Math.PI / 2 - 0.2, -0.2]} scale={0.85}>
              <RiverDolphin t={t + 0.7} pink={0.8} scars={1} />
            </group>
            <FloodedForest />
          </>
        ),
        overlay: <Pop t={t} at={w(8, 4)} size={110} color="#ff5a6a">ROUGH PLAY</Pop>,
      };
    }
    default: {
      // loop: back to the weaving chase of frame 0
      const { pos } = path(d);
      return {
        ...under(t),
        cam: { pos: [pos.x * 0.3, pos.y + lerp(2.3, 1.9, clamp01(u * 2)), pos.z + 5.2], look: [pos.x, pos.y, pos.z - 1.0] },
        body: (
          <>
            <Boto t={t} d={d} />
            <FloodedForest near={pos.z} />
          </>
        ),
      };
    }
  }
};

export const RiverDolphinShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["A DOLPHIN", "IN A FOREST"]}
    label={{ name: "PINK RIVER DOLPHIN", latin: "Inia geoffrensis", beat: 2 }} question="Which river animal should we animate next?" />
);
