// Dev bench (not a short): render any model from up to 4 cameras in one 1920×1080 still, to check it against
// reference photos before building scenes. Pick the model with --props='{"model":"siphon"}'.
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill } from "remotion";
import { DeepSeaLights } from "../env/DeepSea";
import { CameraRig, V3 } from "../lib/shortkit";
import { BlueWhale, GiantSiphon } from "../models/GiantSiphon";

type View = { pos: V3; look?: V3; bg?: string; node: React.ReactNode };

const MODELS: Record<string, View[]> = {
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
