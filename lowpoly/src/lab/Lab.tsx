// Dev bench (not a short): render any model from up to 4 cameras in one 1920×1080 still, to check it against
// reference photos before building scenes. Pick the model with --props='{"model":"siphon"}'.
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill } from "remotion";
import { DeepSeaLights } from "../env/DeepSea";
import { CameraRig, V3 } from "../lib/shortkit";
import { Barreleye } from "../models/Barreleye";
import { BranchStub, Potoo } from "../models/Potoo";
import { Tarsier } from "../models/Tarsier";
import { Sloth } from "../models/Sloth";
import { RiverDolphin } from "../models/RiverDolphin";
import { StarMole } from "../models/StarMole";
import { Trunk } from "../env/Jungle";
import { BlueWhale, GiantSiphon } from "../models/GiantSiphon";
import { DragonEgg, Komodo } from "../models/Komodo";
import { Jellybean, Joey, Kangaroo } from "../models/Kangaroo";
import { Snail } from "../models/Snail";
import { Coyote, HornedLizard } from "../models/HornedLizard";
import { Buffalo } from "../models/Buffalo";
import { Nest, Owl } from "../models/Owl";
import { Seahorse } from "../models/Seahorse";
import { BigCat, Turtle } from "../models/BigCat";
import { Eel, Electrocyte } from "../models/Eel";

type View = { pos: V3; look?: V3; bg?: string; node: React.ReactNode };

const MODELS: Record<string, View[]> = {
  lizard: [
    { pos: [0.6, 0.5, 0.7], look: [0, 0.05, 0], bg: "#d9b48a", node: <HornedLizard t={1} /> },
    { pos: [0.0, 0.9, 0.2], look: [0, 0, 0], bg: "#d9b48a", node: <HornedLizard t={1} puff={1} /> },
    { pos: [2.2, 0.8, 1.4], look: [0, 0.45, 0], bg: "#d9b48a", node: <Coyote t={1} /> },
    { pos: [1.0, 0.8, 1.6], look: [0, 0.6, 0.4], bg: "#d9b48a", node: <Coyote t={1} jaw={1} drool={1} /> },
  ],
  buffalo: [
    { pos: [3.6, 1.2, 2.4], look: [0, 0.7, 0], bg: "#d9b48a", node: <Buffalo t={1} bull /> },
    { pos: [1.2, 1.2, 3.6], look: [0, 0.8, 0.3], bg: "#d9b48a", node: <Buffalo t={1} bull /> },
    { pos: [3.6, 1.2, 2.4], look: [0, 0.5, 0], bg: "#d9b48a", node: <Buffalo t={1} lie={1} /> },
    { pos: [3.6, 1.2, 2.4], look: [0, 0.7, 0], bg: "#d9b48a", node: <Buffalo t={1} raise={1} gaze={0.6} walk={0} /> },
  ],
  owl: [
    { pos: [0.6, 0.7, 2.0], look: [0, 0.5, 0], bg: "#2a3050", node: <Owl t={1} /> },
    { pos: [2.0, 0.7, 0.4], look: [0, 0.5, 0], bg: "#2a3050", node: <Owl t={1} /> },
    { pos: [0.4, 0.8, 2.4], look: [0, 0.6, 0], bg: "#2a3050", node: <Owl t={1} flap={1} /> },
    { pos: [0.5, 0.6, 1.2], look: [0, 0.15, 0], bg: "#2a3050", node: <Nest t={1} chicks={3} /> },
  ],
  seahorse: [
    { pos: [2.6, 0.7, 0.2], look: [0, 0.55, 0], bg: "#5ec4e8", node: <Seahorse t={1} /> },
    { pos: [1.6, 0.8, 2.0], look: [0, 0.55, 0], bg: "#5ec4e8", node: <Seahorse t={1} pouch={1} xray={1} eggs={1} /> },
    { pos: [2.6, 0.7, 0.2], look: [0, 0.55, 0], bg: "#5ec4e8", node: <Seahorse t={1} female /> },
    { pos: [-2.0, 0.9, 1.6], look: [0, 0.55, 0], bg: "#5ec4e8", node: <Seahorse t={1} pouch={0.6} /> },
  ],
  cats: [
    { pos: [3.6, 1.4, 2.6], look: [0, 0.5, 0], bg: "#9fb07a", node: <><group position={[0, 0, 0.8]}><BigCat t={1} kind="tiger" /></group><group position={[1.2, 0, -0.8]}><BigCat t={1} kind="leopard" walk={1} /></group></> },
    { pos: [3.6, 1.4, 2.6], look: [0, 0.5, 0], bg: "#9fb07a", node: <><group position={[0, 0, 0.8]}><BigCat t={1} kind="jaguar" roar={1} /></group><group position={[1.2, 0, -0.8]}><BigCat t={1} kind="puma" /></group></> },
    { pos: [3.6, 1.4, 2.6], look: [0, 0.5, 0], bg: "#c9b48a", node: <><group position={[0, 0, 0.8]}><BigCat t={1} kind="cheetah" /></group><group position={[1.2, 0, -0.8]}><BigCat t={1} kind="ancestor" /></group></> },
    { pos: [1.4, 0.9, 1.4], look: [0, 0.6, 0.4], bg: "#c9b48a", node: <><BigCat t={1} kind="tiger" /><group position={[0.6, 0, 0.6]}><Turtle t={1} crack={0.6} /></group></> },
  ],
  eel: [
    { pos: [3.2, 0.6, 0.4], look: [0, 0, 0], bg: "#6b7a4a", node: <Eel t={1} evo={1} /> },
    { pos: [1.8, 0.4, 0.6], look: [0, 0, 0], bg: "#6b7a4a", node: <Eel t={1} evo={0} /> },
    { pos: [3.0, 0.5, 0.2], look: [0, 0, -0.2], bg: "#3a4430", node: <Eel t={1} evo={1} xray={1} organ={1} fire={0.5} zap={1} /> },
    { pos: [1.6, 0.9, 2.4], look: [0, 0.1, 0], bg: "#3a4430", node: <Electrocyte t={1} fire={0.5} /> },
  ],
  snail: [
    { pos: [2.2, 0.8, 1.2], look: [0, 0.3, 0], bg: "#c9d6a8", node: <Snail t={1} /> },
    { pos: [0.6, 0.5, 2.0], look: [0, 0.3, 0.1], bg: "#c9d6a8", node: <Snail t={1} relax={1} /> },
    { pos: [-2.0, 0.7, -1.0], look: [0, 0.3, 0], bg: "#e8dcc0", node: <Snail t={1} out={0} seal={1} /> },
    { pos: [2.0, 0.8, 1.6], look: [0, 0.35, 0], bg: "#7fa7a0", node: <Snail t={1} pond /> },
  ],
  kangaroo: [
    { pos: [1.4, 0.35, 0.9], look: [0, 0.12, 0], bg: "#7fb07a", node: <Kangaroo t={1} evo={0} /> },
    { pos: [2.2, 0.6, 1.6], look: [0, 0.35, 0], bg: "#d9b48a", node: <Kangaroo t={1} evo={0.5} /> },
    { pos: [4.2, 1.1, 1.6], look: [0, 0.8, 0], bg: "#d9b48a", node: <Kangaroo t={1} evo={1} pouch={1} /> },
    { pos: [0.35, 0.25, 0.5], look: [0, 0.05, 0], bg: "#e8c9a8", node: <><group scale={0.12}><Joey t={1} crawl={1} /></group><group position={[0.22, 0, 0]} scale={0.12}><Jellybean /></group></> },
  ],
  komodo: [
    { pos: [3.4, 0.9, -0.3], look: [0, 0.15, -0.4], bg: "#c9b48a", node: <Komodo t={1} tongue={1} /> },
    { pos: [1.6, 0.6, 2.4], look: [0, 0.2, 0.4], bg: "#c9b48a", node: <Komodo t={1.1} tongue={1} lift={0.5} /> },
    { pos: [0.2, 4.2, -0.3], look: [0, 0, -0.4], bg: "#c9b48a", node: <Komodo t={1} walk={1} /> },
    { pos: [0.5, 0.35, 1.0], look: [0, 0.12, 0], bg: "#c9b48a", node: <><DragonEgg crack={1} /><group position={[0, 0.12, 0.02]} rotation={[-0.9, 0, 0]} scale={0.16}><Komodo t={1} baby lift={0.8} tongue={1} /></group><group position={[0.28, 0, -0.1]}><DragonEgg /></group></> },
  ],
  mole: [
    { pos: [0, 0.05, 1.3], look: [0, 0, 0.4], bg: "#6b5a3a", node: <StarMole t={1} /> },
    { pos: [1.6, 0.4, 0.6], look: [0, 0, 0], bg: "#6b5a3a", node: <StarMole t={1} dig={1} /> },
    { pos: [0.35, 0.15, 0.95], look: [0, 0, 0.5], bg: "#3a3a22", node: <StarMole t={1} sniff={1} glow={0.6} /> },
    { pos: [1.2, 0.9, 1.4], look: [0, 0, 0.1], bg: "#6b5a3a", node: <StarMole t={1} tap={1} /> },
  ],
  dolphin: [
    { pos: [3.2, 0.5, 0.6], look: [0, 0, 0], bg: "#5d6b3a", node: <RiverDolphin t={1} /> },
    { pos: [1.4, 0.5, 2.6], look: [0, 0, 0.3], bg: "#5d6b3a", node: <RiverDolphin t={1} /> },
    { pos: [0.3, 3.0, 0.5], look: [0, 0, 0.2], bg: "#5d6b3a", node: <RiverDolphin t={1} neck={1.4} /> },
    { pos: [2.0, 1.4, 1.2], look: [0, 0.1, -0.2], bg: "#5d6b3a", node: <RiverDolphin t={1} pink={0.5} scars={1} /> },
  ],
  sloth: [
    { pos: [0, 0.3, 2.6], look: [0, 0.1, 0], bg: "#5f9f84", node: <><Sloth t={1} /><Trunk x={0} z={-0.32} r={0.18} y0={-3} y1={3} /></> },
    { pos: [2.2, 0.3, 1.0], look: [0, 0.1, 0], bg: "#5f9f84", node: <><Sloth t={1} climb={0.25} /><Trunk x={0} z={-0.32} r={0.18} y0={-3} y1={3} /></> },
    { pos: [0, 0.6, 1.0], look: [0, 0.45, 0], bg: "#5f9f84", node: <Sloth t={1} algae={1} /> },
    { pos: [1.2, 0.4, 2.4], look: [0, -0.1, 0], bg: "#5f9f84", node: <Sloth t={1} squat={1} /> },
  ],
  tarsier: [
    { pos: [0, 0.3, 1.6], look: [0, 0.2, 0], bg: "#5f9f84", node: <Tarsier t={1} /> },
    { pos: [1.4, 0.3, 0.8], look: [0, 0.1, 0], bg: "#5f9f84", node: <Tarsier t={1} /> },
    { pos: [0, 0.3, 1.6], look: [0, 0.2, 0], bg: "#0b1236", node: <Tarsier t={1} head={Math.PI * 0.9} glow={1} /> },
    { pos: [1.6, 0.2, 0.6], look: [0, 0, 0], bg: "#0b1236", node: <Tarsier t={1} leap={1} glow={1} /> },
  ],
  potoo: [
    { pos: [1.2, 0.5, 3.4], look: [0, 0.2, 0], bg: "#5f9f84", node: <><Potoo t={1} /><group position={[0, -0.85, -0.05]}><BranchStub /></group></> },
    { pos: [1.2, 0.5, 3.4], look: [0, 0.3, 0], bg: "#5f9f84", node: <><Potoo t={1} point={1} /><group position={[0, -0.85, -0.05]}><BranchStub /></group></> },
    { pos: [0.2, 0.75, 1.5], look: [0, 0.6, 0], bg: "#0b1236", node: <Potoo t={1} eyes={1} glow={1} gape={1} /> },
    { pos: [0.4, 0.3, 3.4], look: [0, 0.2, 0], bg: "#0b1236", node: <Potoo t={1.03} eyes={1} fly={1} gape={0.6} /> },
  ],
  barreleye: [
    { pos: [0, 0.15, 2.4], look: [0, 0.1, 0.3], node: <Barreleye t={1} /> },
    { pos: [2.6, 0.4, 0.6], look: [0, 0.05, 0], node: <Barreleye t={1} /> },
    { pos: [1.4, 0.7, 1.8], look: [0, 0.1, 0.2], node: <Barreleye t={1} look={1} /> },
    { pos: [1.2, 1.4, 1.0], look: [0, 0.1, 0.1], node: <Barreleye t={1} /> },
  ],
  siphon: [
    { pos: [0, 3.2, 5.5], node: <GiantSiphon t={1} /> },
    { pos: [0, 0.3, 6.5], look: [0, -0.3, 0], node: <GiantSiphon t={1} /> },
    { pos: [0, 0.5, 7], node: <GiantSiphon t={1} coil={0} /> },
    { pos: [6, 2, 9], look: [0, 0.3, 0], node: <><GiantSiphon t={1} /><group position={[0, 1.6, -0.5]} scale={0.45}><BlueWhale t={1} /></group></> },
  ],
};

export const Lab: React.FC<{ model: string }> = ({ model }) => (
  <AbsoluteFill style={{ flexDirection: "row", flexWrap: "wrap" }}>
    {(MODELS[model] ?? []).map((v, i) => (
      <div key={i} style={{ width: 960, height: 540, background: v.bg ?? "linear-gradient(#13265C,#02040b)" }}>
        <ThreeCanvas width={960} height={540} gl={{ alpha: true, antialias: true }} camera={{ fov: 35 }}>
          <CameraRig pos={v.pos} look={v.look ?? [0, 0, 0]} />
          <DeepSeaLights light={1.2} />
          {v.node}
        </ThreeCanvas>
      </div>
    ))}
  </AbsoluteFill>
);
