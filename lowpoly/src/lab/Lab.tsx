// Dev bench (not a short): render any model from up to 4 cameras in one 1920×1080 still, to check it against
// reference photos before building scenes. Pick the model with --props='{"model":"siphon"}'.
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill } from "remotion";
import { DeepSeaLights } from "../env/DeepSea";
import { CameraRig, V3 } from "../lib/shortkit";
import { Barreleye } from "../models/Barreleye";
import { BranchStub, Potoo } from "../models/Potoo";
import { Tarsier } from "../models/Tarsier";
import { BlueWhale, GiantSiphon } from "../models/GiantSiphon";

type View = { pos: V3; look?: V3; bg?: string; node: React.ReactNode };

const MODELS: Record<string, View[]> = {
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
