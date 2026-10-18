// Dev bench (not a short): 4 views of the blobfish model to compare against reference photos.
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill } from "remotion";
import { CameraRig, V3 } from "../lib/shortkit";
import { Blobfish } from "../models/Blobfish";

const View: React.FC<{ melt: number; pos: V3; look?: V3; bg: string }> = ({ melt, pos, look = [0, -0.05, 0], bg }) => (
  <div style={{ width: 960, height: 540, background: bg }}>
    <ThreeCanvas width={960} height={540} gl={{ alpha: true, antialias: true }} camera={{ fov: 35 }}>
      <CameraRig pos={pos} look={look} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 5, 4]} intensity={2.4} />
      <directionalLight position={[-3, 1, -3]} intensity={0.8} color="#9fd8ff" />
      <mesh position={[0, -0.37, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#3a3f4a" />
      </mesh>
      <Blobfish t={0.3} melt={melt} swim={0} />
    </ThreeCanvas>
  </div>
);

export const BlobfishLab: React.FC = () => (
  <AbsoluteFill style={{ flexDirection: "row", flexWrap: "wrap" }}>
    <View melt={1} pos={[0, 0.25, 3.2]} bg="#222" />
    <View melt={1} pos={[1.9, 0.6, 2.6]} bg="#222" />
    <View melt={0} pos={[3.4, 0.4, 1.6]} look={[0, -0.05, -0.3]} bg="#0d1a33" />
    <View melt={0} pos={[1.2, 0.5, 2.8]} bg="#0d1a33" />
  </AbsoluteFill>
);
