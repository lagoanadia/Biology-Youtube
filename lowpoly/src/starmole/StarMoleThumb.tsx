// Thumbnail for the star-nosed mole short: 3/4 close view of the pink 22-tentacle star.
import { AbsoluteFill } from "remotion";
import { ThumbShell } from "../lib/shortkit";
import { StarMole } from "../models/StarMole";

export const StarMoleThumb: React.FC = () => (
  <ThumbShell
    bg={<AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 60%, #8a6a40 0%, #3a2814 60%, #160d05 100%)" }} />}
    world={<><ambientLight intensity={0.7} color="#ffd9a8" /><directionalLight position={[1, 3, 3]} intensity={2.2} color="#ffe0b8" /></>}
    cam={{ pos: [1.1, 0.45, 2.3], look: [-0.05, 0.12, 0.1] }}
    body={<StarMole t={0.4} tap={0.3} glow={0.25} />}
    lines={["FASTEST EATER", "OF MAMMALS"]}
    color="#ff8fb0"
    size={104}
  />
);
