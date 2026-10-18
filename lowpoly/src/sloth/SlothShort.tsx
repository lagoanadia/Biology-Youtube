// "This Sloth Risks Its Life Just to Poop" — three-toed sloth low-poly short with the 2026-10-18 analytics rules
// (hook card at frame 0, name label, loop ending, on-screen CTA). Scenes follow shorts/en/sloth-poop-trip.yaml.
// Facts: Pauli et al. 2014 (Proc R Soc B), Animal Diversity Web (package sources).
import { useMemo } from "react";
import * as THREE from "three";
import { ForestBack, JungleBackdrop, JungleLights, Leaves, Motes, Trunk } from "../env/Jungle";
import { clamp01, facet, glide, lerp, rng } from "../lib/lowpoly";
import { Pop, Shot, ShortShell } from "../lib/shortkit";
import { sceneAt, scenesOf, ShortProps, Timeline, wordTime } from "../lib/timeline";
import { Hawk, Moth } from "../models/Potoo";
import { Sloth } from "../models/Sloth";

const KEYWORDS = ["week", "poop", "treetops", "target", "moths", "eggs", "fur", "algae", "snack", "climbs"];
const TRUNK_Z = -0.32;
const GROUND = -1.2;

const env = (t: number, light = 1): Pick<Shot, "bg" | "world"> => ({
  bg: <JungleBackdrop time="day" />,
  world: (
    <>
      <JungleLights time="day" light={light} />
      <Motes t={t} count={30} />
    </>
  ),
});

// the tree, forest floor, ferns and background
const Scene: React.FC = () => (
  <>
    <Trunk x={0} z={TRUNK_Z} r={0.18} y0={-1.3} y1={9} seed={4} />
    <mesh position={[0, GROUND - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[12, 14]} />
      <meshStandardMaterial color="#4a3a24" flatShading roughness={1} />
    </mesh>
    <Leaves pos={[-1.3, GROUND + 0.2, -0.6]} size={0.5} seed={2} tint="#2f6a2c" />
    <Leaves pos={[1.5, GROUND + 0.25, -0.9]} size={0.6} seed={6} tint="#356f30" />
    <Leaves pos={[-1.2, 2.4, -1.2]} size={1.0} seed={8} />
    <ForestBack z={-7} />
  </>
);

// a small, cartoonish poop pile at the foot of the tree (+ moth eggs on it)
const Pile: React.FC<{ eggs?: number }> = ({ eggs = 0 }) => {
  const parts = useMemo(() => {
    const r = rng(17);
    return Array.from({ length: 7 }, () => ({ p: [(r() - 0.5) * 0.18, r() * 0.05, (r() - 0.5) * 0.14] as [number, number, number],
      g: facet(new THREE.IcosahedronGeometry(1, 0), 0.2, Math.floor(r() * 99)) }));
  }, []);
  const r = rng(5);
  return (
    <group position={[0.55, GROUND + 0.03, 0.3]}>
      {parts.map((q, i) => (
        <mesh key={i} geometry={q.g} position={q.p} scale={0.045}>
          <meshStandardMaterial color="#5a3f22" flatShading />
        </mesh>
      ))}
      {Array.from({ length: Math.round(eggs * 10) }, (_, i) => (
        <mesh key={i} position={[(r() - 0.5) * 0.16, 0.07 + r() * 0.02, (r() - 0.5) * 0.12]} scale={0.009}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#fffbe8" />
        </mesh>
      ))}
    </group>
  );
};

// glowing predator eyes in the ferns
const Eyes: React.FC<{ t: number; on: number }> = ({ t, on }) =>
  on <= 0 ? null : (
    <group position={[-1.2, GROUND + 0.28, 0.05]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.09, 0, 0.35]} scale={[0.045, 0.045 * Math.min(1, on) * (Math.sin(t * 3) > 0.95 ? 0.1 : 1), 0.02]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color="#ffe14a" />
        </mesh>
      ))}
    </group>
  );

// moths: crawling in the fur / flying between the pile and the canopy
const Moths: React.FC<{ t: number; n: number; from: THREE.Vector3; to: THREE.Vector3; k: number; spread?: number }> = ({ t, n, from, to, k, spread = 0.3 }) => {
  const r = rng(23);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const o = new THREE.Vector3((r() - 0.5) * spread, (r() - 0.5) * spread, (r() - 0.5) * spread * 0.5);
        const kk = clamp01(k * 1.2 - i * 0.06);
        const p = from.clone().lerp(to, kk).add(o).add(new THREE.Vector3(Math.sin(t * 4 + i) * 0.05, Math.sin(t * 5 + i * 2) * 0.05, 0));
        return (
          <group key={i} position={p.toArray()} rotation={[0, i, 0]} scale={0.22}>
            <Moth t={t + i} color="#a89068" />
          </group>
        );
      })}
    </>
  );
};

const shotAt = (tl: Timeline, t: number): Shot => {
  const { scene, s, dur: D, u } = sceneAt(scenesOf(tl), t);
  const S = scene.start;
  const w = (beat: number, word: number) => wordTime(tl, beat, word);
  const sloth = (y: number, p: { climb?: number; algae?: number; chew?: number; squat?: number } = {}) => (
    <group position={[0, y, 0]}>
      <Sloth t={t} {...p} />
    </group>
  );
  const sitY = GROUND + 0.42;

  switch (scene.visual) {
    case "hook": {
      // at the foot of the tree, exposed — eyes glint in the ferns
      const sub = s > D * 0.55;
      return {
        ...env(t),
        cam: sub ? { pos: [-1.6, GROUND + 0.7, 2.6], look: [-0.6, GROUND + 0.4, 0] } : { pos: [1.4, GROUND + 1.0, 4.4 - u * 0.3], look: [0, GROUND + 0.6, 0] },
        body: (
          <>
            {sloth(sitY, { squat: 1, algae: 0.5 })}
            <Pile />
            <Eyes t={t} on={sub ? 1 : 0.6} />
            <Scene />
          </>
        ),
      };
    }
    case "climb": {
      // the long climb down from the treetops (camera follows)
      const y = glide(s, 0, D, 3.2, 0.6);
      return {
        ...env(t),
        cam: { pos: [1.4, y + 0.5, 4.0], look: [0, y + 0.15, 0] },
        body: (
          <>
            {sloth(y, { climb: t * 0.25, algae: 0.5 })}
            <Scene />
          </>
        ),
        overlay: <Pop t={t} at={S + 0.2} size={120} color="#ffd34d">ONCE A WEEK</Pop>,
      };
    }
    case "ground": {
      // on the ground: a harpy eagle circles, eyes in the ferns
      return {
        ...env(t, 0.9),
        cam: { pos: [0.6, GROUND + 1.2, 3.8], look: [0, GROUND + 0.6, 0] },
        body: (
          <>
            {sloth(sitY, { squat: 1, algae: 0.5 })}
            <Eyes t={t} on={1} />
            <group position={[lerp(-3, 3, u), GROUND + 2.6, -1]} rotation={[0.3, Math.PI / 2, 0]} scale={0.8}>
              <Hawk t={t} />
            </group>
            <Scene />
          </>
        ),
        overlay: <Pop t={t} at={w(2, 5)} size={110} color="#ff5a6a">EASY TARGET</Pop>,
      };
    }
    case "moths": {
      // close on the fur: tiny moths living in it
      return {
        ...env(t),
        cam: { pos: [0.7, 1.9, 2.1], look: [0, 1.5, 0] },
        body: (
          <>
            {sloth(1.3, { algae: 0.5 })}
            <Moths t={t} n={6} from={new THREE.Vector3(0.05, 1.35, 0.25)} to={new THREE.Vector3(0.05, 1.35, 0.25)} k={0} spread={0.35} />
            <Scene />
          </>
        ),
        overlay: <Pop t={t} at={w(3, 6)} size={100} color="#ffd34d">MOTHS IN ITS FUR</Pop>,
      };
    }
    case "eggs": {
      // the moths flutter down to the pile and lay eggs
      const k = glide(s, 0, D * 0.5, 0, 1);
      return {
        ...env(t),
        cam: { pos: [1.3, GROUND + 0.7, 1.9], look: [0.45, GROUND + 0.2, 0.2] },
        body: (
          <>
            {sloth(sitY, { squat: 1, algae: 0.5 })}
            <Pile eggs={glide(s, D * 0.45, D * 0.9, 0, 1)} />
            <Moths t={t} n={4} from={new THREE.Vector3(0.3, GROUND + 0.7, 0.3)} to={new THREE.Vector3(0.55, GROUND + 0.12, 0.3)} k={k} spread={0.15} />
            <Scene />
          </>
        ),
        overlay: <Pop t={t} at={w(4, 4)} size={110} color="#fffbe8">EGGS</Pop>,
      };
    }
    case "flyup": {
      // new moths fly from the pile up to a sloth in the canopy
      const k = glide(s, 0, D, 0, 1);
      return {
        ...env(t),
        cam: { pos: [2.2, lerp(GROUND + 0.6, 2.2, k), 4.2], look: [0, lerp(GROUND + 0.3, 2.4, k), 0] },
        body: (
          <>
            {sloth(2.5, { algae: 0.5 })}
            <Pile />
            <Moths t={t} n={6} from={new THREE.Vector3(0.55, GROUND + 0.2, 0.3)} to={new THREE.Vector3(0.05, 2.55, 0.25)} k={k} spread={0.4} />
            <Scene />
          </>
        ),
        overlay: <Pop t={t} at={w(5, 1)} size={110} color="#ffd34d">NEW MOTHS</Pop>,
      };
    }
    case "algae": {
      // the fur turns greener
      return {
        ...env(t),
        cam: { pos: [0.5, 2.85, 2.5 - u * 0.2], look: [0, 2.6, 0] },
        body: (
          <>
            {sloth(2.3, { algae: glide(s, 0.2, D * 0.8, 0.4, 1) })}
            <Moths t={t} n={5} from={new THREE.Vector3(0.05, 2.35, 0.25)} to={new THREE.Vector3(0.05, 2.35, 0.25)} k={0} spread={0.4} />
            <Scene />
          </>
        ),
        overlay: <Pop t={t} at={w(6, 3)} size={110} color="#7dff6a">GREEN ALGAE</Pop>,
      };
    }
    case "snack": {
      return {
        ...env(t),
        cam: { pos: [0.3, 2.9, 1.9], look: [0, 2.78, 0] },
        body: (
          <>
            {sloth(2.3, { algae: 1, chew: (Math.sin(t * 8) + 1) / 2 })}
            <Scene />
          </>
        ),
        overlay: <Pop t={t} at={w(7, 8)} size={130} color="#7dff6a">SNACK!</Pop>,
      };
    }
    default: {
      // loop: it starts the climb down again, ending at the frame-0 spot
      const y = glide(u, 0, 1, 2.0, sitY + 0.15);
      return {
        ...env(t),
        cam: { pos: [1.2, lerp(y + 0.6, GROUND + 0.9, glide(u, 0.4, 1, 0, 1)), 3.4], look: [0, lerp(y + 0.1, GROUND + 0.45, glide(u, 0.4, 1, 0, 1)), 0] },
        body: (
          <>
            {sloth(y, { climb: t * 0.25, algae: 0.8, squat: glide(u, 0.8, 1, 0, 1) })}
            <Scene />
          </>
        ),
      };
    }
  }
};

export const SlothShort: React.FC<ShortProps> = ({ timeline }) => (
  <ShortShell timeline={timeline} shotAt={shotAt} keywords={KEYWORDS} hook={["RISKS ITS LIFE", "TO POOP"]}
    label={{ name: "THREE-TOED SLOTH", latin: "Bradypus variegatus" }} question="Would you climb down a tree for a snack?" />
);
