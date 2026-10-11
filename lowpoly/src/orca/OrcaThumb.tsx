// Thumbnail (still, 1080×1920) for the orca wave-washing short.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { PolarBackdrop, PolarLights, PushWave, Water } from "../env/Polar";
import { Seal } from "../models/PolarAnimals";
import { Floe, SwimOrca } from "./OrcaShort";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

const Cam: React.FC = () => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(4.6, 4.2, 11.5);
    camera.lookAt(0, 0.6, 1.6);
  });
  return null;
};

const Line: React.FC<{ text: string; size: number; color?: string }> = ({ text, size, color = "#fff" }) => (
  <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color, WebkitTextStroke: "16px #0b1622",
    paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
    {text}
  </div>
);

export const OrcaThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  const t = 1.5;
  const push: PushWave[] = [{ dirX: 0, dirZ: -1, pos: -2.2, amp: 0.7, width: 0.8 }];
  return (
    <AbsoluteFill>
      <PolarBackdrop />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 38, far: 80 }}>
        <Cam />
        <PolarLights />
        <Water t={t} push={push} />
        <Floe t={t} at={[0, 0, 0]} push={push}>
          <group position={[0.15, 0.2, 0]} rotation={[0, 0.9, 0]}>
            <Seal t={t} kind="weddell" />
          </group>
        </Floe>
        {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
          <SwimOrca key={i} t={t} at={[x, 0, 3.6]} yaw={Math.PI} seed={i + 1} />
        ))}
      </ThreeCanvas>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 380, gap: 14, textAlign: "center" }}>
        <Line text="THEY MAKE" size={120} />
        <Line text="WAVES" size={210} color="#ffd34d" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
