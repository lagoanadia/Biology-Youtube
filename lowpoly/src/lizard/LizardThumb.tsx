// Thumbnail for the horned lizard POV short: the lizard squirting blood at a coyote's face.
import { IslandBackdrop, IslandLights, Sand } from "../env/Island";
import { ThumbShell } from "../lib/shortkit";
import { Coyote, HornedLizard } from "../models/HornedLizard";
import { LizardJets } from "./LizardShort";

export const LizardThumb: React.FC = () => (
  <ThumbShell
    bg={<IslandBackdrop sky="warm" />}
    world={<IslandLights sky="warm" light={1.1} fogNear={8} fogFar={28} />}
    cam={{ pos: [1.5, 0.4, 0.1], look: [0, 0.3, 0.35] }}
    body={
      <>
        <Sand color="#d6ad74" rocks={4} size={30} seed={11} />
        <group scale={1.4}>
          <HornedLizard t={1} puff={0.3} />
          <LizardJets k={0.9} L={0.22} lift={0.6} />
        </group>
        <group position={[0.05, 0, 0.95]} rotation={[0, Math.PI, 0]}>
          <Coyote t={1} jaw={0.6} headDown={0.8} />
        </group>
      </>
    }
    lines={["SHOOTS", "EYE BLOOD"]}
  />
);
