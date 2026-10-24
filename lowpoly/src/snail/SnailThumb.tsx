// Thumbnail for the snail POV short: the desert snail peeking out of its shell on its museum specimen card.
import { Card, Dust, MuseumBackdrop, MuseumLights, MuseumRoom } from "../env/Museum";
import { ThumbShell } from "../lib/shortkit";
import { Snail } from "../models/Snail";

export const SnailThumb: React.FC = () => (
  <ThumbShell
    bg={<MuseumBackdrop />}
    world={<MuseumLights light={1.15} />}
    cam={{ pos: [3.5, 1.5, 0.9], look: [-0.1, 0.32, 0.15] }}
    body={
      <>
        <MuseumRoom />
        <Card />
        <Dust t={1} />
        <group position={[0, 0.012, -0.1]} rotation={[0, -0.25, 0]}>
          <Snail t={1} />
        </group>
      </>
    }
    lines={["GLUED FOR", "4 YEARS"]}
  />
);
