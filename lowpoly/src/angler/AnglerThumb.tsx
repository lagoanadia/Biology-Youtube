// Thumbnail (still, 1080×1920) for the anglerfish short: the female with the fused male + hook text.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { FemaleAngler, MaleAngler } from "../models/Angler";
import { ATTACH, ATTACH_ROT } from "./AnglerShort";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

const Cam: React.FC = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(2.4, -0.4, 7.8);
    camera.lookAt(0.2, -0.35, 0);
  });
  return null;
};

const Line: React.FC<{ text: string; size: number; color?: string }> = ({ text, size, color = "#fff" }) => (
  <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color, WebkitTextStroke: "16px #060a18",
    paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,0.7)" }}>
    {text}
  </div>
);

export const AnglerThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop dim={0.3} />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35 }}>
        <Cam />
        <DeepSeaLights light={0.95} />
        <MarineSnow t={2} count={50} />
        <group rotation={[0, -0.25, 0]}>
          <FemaleAngler t={1.3} mouth={0.6} halo={1.6} />
          <group position={ATTACH} rotation={ATTACH_ROT} scale={0.55}>
            <MaleAngler t={1} fused={0.5} swim={0} />
          </group>
        </group>
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 300, gap: 14, textAlign: "center" }}>
        <Line text="HE NEVER" size={130} />
        <Line text="LETS GO" size={180} color="#ff6b7a" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
