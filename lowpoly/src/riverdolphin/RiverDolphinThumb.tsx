// Thumbnail for the pink river dolphin short: the boto gliding between flooded trunks.
import { Trunk } from "../env/Jungle";
import { GodRays, RiverBackdrop, Riverbed, RiverLights, Silt } from "../env/River";
import { ThumbShell } from "../lib/shortkit";
import { RiverDolphin } from "../models/RiverDolphin";

export const RiverDolphinThumb: React.FC = () => (
  <ThumbShell
    bg={<RiverBackdrop />}
    world={<><RiverLights light={1.25} /><GodRays t={1} /><Silt t={1} count={60} spread={7} /></>}
    cam={{ pos: [3.6, 1.3, 5.8], look: [0, -0.35, -0.2] }}
    body={
      <>
        <group position={[0, -0.5, 0]} rotation={[0, -0.35, 0.12]}>
          <RiverDolphin t={0.3} neck={0.4} />
        </group>
        <Trunk x={-1.1} z={-1.2} r={0.3} y0={-2.3} y1={6} seed={2} />
        <Trunk x={1.4} z={-2.5} r={0.25} y0={-2.3} y1={6} seed={5} />
        <Trunk x={-0.3} z={-3.8} r={0.28} y0={-2.3} y1={6} seed={7} />
        <Riverbed y={-2.3} />
      </>
    }
    lines={["A DOLPHIN", "IN A FOREST"]}
    color="#ff8fb0"
    size={130}
  />
);
