// Thumbnail (still, 1080×1920) for the owlfish short: face-on, huge glowing eyes.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { Owlfish } from "../models/Owlfish";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

const Cam: React.FC = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(2.5, 0.5, 3.7);
    camera.lookAt(-0.05, -0.1, 0.35);
  });
  return null;
};

const Line: React.FC<{ text: string; size: number; color?: string }> = ({ text, size, color = "#fff" }) => (
  <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color, WebkitTextStroke: "16px #060a18",
    paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,0.7)" }}>
    {text}
  </div>
);

export const OwlfishThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop dim={0.3} />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35 }}>
        <Cam />
        <DeepSeaLights light={1.1} />
        <MarineSnow t={2} count={50} />
        <Owlfish t={0.5} swim={0.2} eyeGlow={0.9} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 230, gap: 14, textAlign: "center" }}>
        <Line text="EYES AS BIG" size={120} color="#9fdcff" />
        <Line text="AS ITS HEAD" size={120} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
