// Thumbnail for the giant siphonophore short: the spiral with a blue whale gliding over it.
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { ThumbShell } from "../lib/shortkit";
import { BlueWhale, GiantSiphon } from "../models/GiantSiphon";

export const GiantSiphonThumb: React.FC = () => (
  <ThumbShell
    bg={<DeepSeaBackdrop dim={0.2} />}
    world={<><DeepSeaLights light={1.2} /><MarineSnow t={3} count={60} spread={7} /></>}
    cam={{ pos: [0, 5.2, 8.6], look: [0, -0.4, 0] }}
    body={
      <>
        <GiantSiphon t={1} glow={0.3} />
        <group position={[-0.4, 1.0, 1.4]} rotation={[0, Math.PI / 2 - 0.2, 0.05]} scale={0.55}>
          <BlueWhale t={1} />
        </group>
      </>
    }
    lines={["LONGER THAN", "A BLUE WHALE"]}
    size={118}
  />
);
