// Thumbnail (still, 1080×1920) for the brooding octopus short.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "../lib/montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { RockOutcrop } from "../env/Rock";
import { Eggs } from "../models/Eggs";
import { Octopus } from "../models/Octopus";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

const Cam: React.FC = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0.55, -0.1, 3.1);
    camera.lookAt(0, -0.25, 0);
  });
  return null;
};

const Line: React.FC<{ text: string; size: number; color?: string }> = ({ text, size, color = "#fff" }) => (
  <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color, WebkitTextStroke: "16px #060a18",
    paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,0.7)" }}>
    {text}
  </div>
);

export const OctopusThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35 }}>
        <Cam />
        <DeepSeaLights />
        <MarineSnow t={2} />
        <RockOutcrop />
        <group position={[0, -0.76, 0.06]}>
          <Eggs t={1} grow={0.8} embryo={0.6} />
        </group>
        <group position={[0, -0.5, 0.02]}>
          <Octopus t={1.2} pale={0.35} />
        </group>
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 230, gap: 14, textAlign: "center" }}>
        <Line text="4.5 YEARS" size={190} color="#ffd34d" />
        <Line text="ON HER EGGS" size={112} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
