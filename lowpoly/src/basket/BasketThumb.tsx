// Thumbnail (still, 1080×1920) for the basket star short.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { Star } from "./BasketShort";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

const Cam: React.FC = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0.5, 1.9, 5.2);
    camera.lookAt(0, 0.15, 0);
  });
  return null;
};

const Line: React.FC<{ text: string; size: number; color?: string }> = ({ text, size, color = "#fff" }) => (
  <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color, WebkitTextStroke: "16px #060a18",
    paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,0.7)" }}>
    {text}
  </div>
);

export const BasketThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop dim={0.2} />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35 }}>
        <Cam />
        <DeepSeaLights light={1.05} />
        <MarineSnow t={2} count={50} />
        <Star t={1.7} open={0.75} writhe={0.9} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 200, gap: 14, textAlign: "center" }}>
        <Line text="NAMED AFTER" size={110} />
        <Line text="MEDUSA" size={200} color="#9cf07a" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
