// Thumbnail (still, 1080×1920) for the blobfish short: the famous blob vs how it really looks at depth.
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "../lib/montserrat";
import { CameraRig } from "../lib/shortkit";
import { Blobfish } from "../models/Blobfish";

const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

const Line: React.FC<{ text: string; size: number; color?: string }> = ({ text, size, color = "#fff" }) => (
  <div style={{ fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1, color, WebkitTextStroke: "16px #060a18",
    paintOrder: "stroke fill", textShadow: "0 10px 30px rgba(0,0,0,0.7)" }}>
    {text}
  </div>
);

export const BlobfishThumb: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(to bottom, #8fd3ff 0%, #2e6fae 45%, #0A1530 70%, #02040b 100%)" }}>
      <ThreeCanvas width={width} height={height} gl={{ alpha: true, antialias: true }} camera={{ fov: 35 }}>
        <CameraRig pos={[0, 0.6, 7.6]} look={[0, -0.45, 0]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 6, 4]} intensity={2.5} />
        <directionalLight position={[-3, 1, -3]} intensity={0.9} color="#5fe7ff" />
        <group position={[0, 0.05, 0]} rotation={[0, -0.25, 0]}>
          <Blobfish t={0} melt={1} swim={0} />
        </group>
        <group position={[0.05, -1.75, 0]} rotation={[0, 0.9, 0]} scale={0.85}>
          <Blobfish t={0.4} melt={0} swim={0.3} />
        </group>
      </ThreeCanvas>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 230, gap: 14, textAlign: "center" }}>
        <Line text="NOT ITS" size={150} />
        <Line text="REAL FACE" size={150} color="#ffd34d" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
