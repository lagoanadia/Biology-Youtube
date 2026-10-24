// Thumbnail for the barn owl POV short: the couple turning their backs on each other in the moonlit barn.
import { BarnBackdrop, BarnLights, BarnLoft } from "../env/Barn";
import { ThumbShell } from "../lib/shortkit";
import { Nest, Owl } from "../models/Owl";

export const OwlThumb: React.FC = () => (
  <ThumbShell
    bg={<BarnBackdrop />}
    world={<BarnLights light={1.15} />}
    cam={{ pos: [0.1, 1.45, 4.3], look: [0.02, 0.5, -0.1] }}
    body={
      <>
        <BarnLoft t={1} />
        <group position={[0.02, 0, -0.45]}>
          <Nest t={1} chicks={0} />
        </group>
        <group position={[-0.33, 0, 0.25]} rotation={[0, -0.7, 0]}>
          <Owl t={1} mood={1} />
        </group>
        <group position={[0.36, 0, 0.1]} rotation={[0, 0.7, 0]}>
          <Owl t={2} seed={3} mood={1} />
        </group>
      </>
    }
    lines={["OWL", "DIVORCE"]}
    size={160}
  />
);
