// Thumbnail for the hedgehog spines short: the furry ancestor next to the spiky hedgehog it became.
import { ThumbShell } from "../lib/shortkit";
import { Hedgehog } from "../models/Hedgehog";
import { env, Floor } from "./HedgehogShort";

export const HedgehogThumb: React.FC = () => {
  const e = env(1, 1.4);
  return (
    <ThumbShell
      bg={e.bg}
      world={e.world}
      cam={{ pos: [0.2, 0.55, 2.0], look: [0, 0.2, 0] }}
      body={
        <>
          <group position={[-0.28, 0, -0.1]} rotation={[0, 0.7, 0]}>
            <Hedgehog t={1} kind="ancestor" />
          </group>
          <group position={[0.28, 0, 0.15]} rotation={[0, -0.6, 0]}>
            <Hedgehog t={1} kind="hedgehog" />
          </group>
          <Floor />
        </>
      }
      lines={["SPIKES", "WERE HAIR"]}
      size={140}
    />
  );
};
