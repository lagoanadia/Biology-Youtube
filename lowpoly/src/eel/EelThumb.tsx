// Thumbnail for the electric eel POV short: the eel crackling with sparks in murky water.
import { RiverBackdrop, RiverLights, Riverbed, Silt } from "../env/River";
import { ThumbShell } from "../lib/shortkit";
import { Eel } from "../models/Eel";

export const EelThumb: React.FC = () => (
  <ThumbShell
    bg={<RiverBackdrop dim={0.35} />}
    world={<RiverLights light={1.2} fogNear={2} fogFar={10} />}
    cam={{ pos: [3.7, 1.1, 3.9], look: [0.05, 0.3, 0.45] }}
    body={
      <>
        <Riverbed y={-0.6} color="#3a2f1e" />
        <Silt t={1} />
        <group rotation={[0.35, 0.2, 0]}>
          <Eel t={1.3} evo={1} zap={1.6} />
        </group>
        <pointLight position={[0.3, 0.5, 0.6]} intensity={6} distance={5} color="#bff6ff" />
      </>
    }
    lines={["860", "VOLTS"]}
    size={170}
  />
);
