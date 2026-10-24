// Thumbnail for the buffalo POV short: aerial view of the herd mid-vote, golden arrows over the cows that stood up.
import { IslandBackdrop, IslandLights } from "../env/Island";
import { Outback } from "../kangaroo/KangarooShort";
import { ThumbShell } from "../lib/shortkit";
import { VotingHerd } from "./BuffaloShort";

export const BuffaloThumb: React.FC = () => (
  <ThumbShell
    bg={<IslandBackdrop sky="warm" />}
    world={<IslandLights sky="warm" light={1.1} fogNear={10} fogFar={34} />}
    cam={{ pos: [-0.9, 3.3, -1.6], look: [1.7, 0.5, 2.9] }}
    body={
      <>
        <Outback t={1} />
        <VotingHerd t={1} />
      </>
    }
    lines={["BUFFALO", "ELECTION"]}
  />
);
