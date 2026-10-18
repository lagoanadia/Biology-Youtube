// Thumbnail (still, 1080×1920) for the comb jelly short: the rainbow animal + a short hook in rainbow letters.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "../lib/montserrat";
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { rainbow } from "../lib/lowpoly";
import { CombJelly } from "../models/CombJelly";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

const Cam: React.FC = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0.6, 0.3, 5.4);
    camera.lookAt(0, -0.6, 0);
  });
  return null;
};

const Word: React.FC<{ text: string; size: number; rainbowLetters?: boolean }> = ({ text, size, rainbowLetters }) => (
  <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color: "#fff", WebkitTextStroke: "16px #060a18",
    paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,0.7)", letterSpacing: 2 }}>
    {rainbowLetters
      ? [...text].map((ch, i) => (
          <span key={i} style={{ color: rainbow(i / text.length, 0.6).getStyle() }}>{ch}</span>
        ))
      : text}
  </div>
);

export const CombJellyThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DeepSeaBackdrop />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35 }}>
        <Cam />
        <DeepSeaLights />
        <MarineSnow t={4} />
        <group rotation={[0.1, 0.4, 0.06]}>
          <CombJelly t={3.3} rainbow={1} beat={0.9} />
        </group>
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 430, gap: 12, textAlign: "center" }}>
        <Word text="A LIVING" size={118} />
        <Word text="RAINBOW" size={176} rainbowLetters />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
