// Thumbnail (still, 1080×1920) for the Christmas tree siphonophore short.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { Siphonophore } from "../models/Siphonophore";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

const Cam: React.FC = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0.8, 0.4, 7.4);
    camera.lookAt(0, -0.55, 0);
  });
  return null;
};

const Line: React.FC<{ text: string; size: number; color?: string }> = ({ text, size, color = "#fff" }) => (
  <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color, WebkitTextStroke: "16px #060a18",
    paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,0.7)" }}>
    {text}
  </div>
);

export const SiphonThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop dim={0.35} />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35 }}>
        <Cam />
        <DeepSeaLights light={1.05} />
        <MarineSnow t={2} count={60} />
        <Siphonophore t={1.3} spin={0.6} sting={0.9} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 260, gap: 14, textAlign: "center" }}>
        <Line text="DON'T TOUCH" size={128} color="#ff6b7a" />
        <Line text="THIS TREE" size={150} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
