import { LizardThumb } from "./lizard/LizardThumb";
import { LizardShort } from "./lizard/LizardShort";
import { BuffaloThumb } from "./buffalo/BuffaloThumb";
import { BuffaloShort } from "./buffalo/BuffaloShort";
import { OwlThumb } from "./owl/OwlThumb";
import { OwlShort } from "./owl/OwlShort";
import { SeahorseThumb } from "./seahorse/SeahorseThumb";
import { SeahorseShort } from "./seahorse/SeahorseShort";
import { BigCatsThumb } from "./bigcats/BigCatsThumb";
import { BigCatsShort } from "./bigcats/BigCatsShort";
import { EelThumb } from "./eel/EelThumb";
import { EelShort } from "./eel/EelShort";
import { SnailThumb } from "./snail/SnailThumb";
import { SnailShort } from "./snail/SnailShort";
import { KangarooThumb } from "./kangaroo/KangarooThumb";
import { KangarooShort } from "./kangaroo/KangarooShort";
import { KomodoThumb } from "./komodo/KomodoThumb";
import { KomodoShort } from "./komodo/KomodoShort";
import { Composition, Still } from "remotion";
import { CombJellyThumb } from "./combjelly/CombJellyThumb";
import { OctopusShort } from "./octopus/OctopusShort";
import { OctopusThumb } from "./octopus/OctopusThumb";
import { OrcaShort } from "./orca/OrcaShort";
import { OrcaThumb } from "./orca/OrcaThumb";
import { AnglerShort } from "./angler/AnglerShort";
import { AnglerThumb } from "./angler/AnglerThumb";
import { BasketShort } from "./basket/BasketShort";
import { BasketThumb } from "./basket/BasketThumb";
import { SeaPenShort } from "./seapen/SeaPenShort";
import { SeaPenThumb } from "./seapen/SeaPenThumb";
import { SiphonShort } from "./siphon/SiphonShort";
import { SiphonThumb } from "./siphon/SiphonThumb";
import { OwlfishShort } from "./owlfish/OwlfishShort";
import { OwlfishThumb } from "./owlfish/OwlfishThumb";
import { CombJellyShort } from "./combjelly/CombJellyShort";
import { BlobfishShort } from "./blobfish/BlobfishShort";
import { BlobfishLab } from "./blobfish/BlobfishLab";
import { BlobfishThumb } from "./blobfish/BlobfishThumb";
import { Lab } from "./lab/Lab";
import { GiantSiphonShort } from "./giantsiphon/GiantSiphonShort";
import { GiantSiphonThumb } from "./giantsiphon/GiantSiphonThumb";
import { BarreleyeShort } from "./barreleye/BarreleyeShort";
import { BarreleyeThumb } from "./barreleye/BarreleyeThumb";
import { PotooShort } from "./potoo/PotooShort";
import { PotooThumb } from "./potoo/PotooThumb";
import { TarsierShort } from "./tarsier/TarsierShort";
import { TarsierThumb } from "./tarsier/TarsierThumb";
import { SlothShort } from "./sloth/SlothShort";
import { SlothThumb } from "./sloth/SlothThumb";
import { RiverDolphinShort } from "./riverdolphin/RiverDolphinShort";
import { RiverDolphinThumb } from "./riverdolphin/RiverDolphinThumb";
import { StarMoleShort } from "./starmole/StarMoleShort";
import { StarMoleThumb } from "./starmole/StarMoleThumb";
import { FPS, loadTimeline, ShortProps } from "./lib/timeline";

// One composition per low-poly short. Duration comes from public/<id>/timeline.json (scripts/render_lowpoly.py).
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="CombJelly"
      component={CombJellyShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={840}
      defaultProps={{ timelineFile: "comb-jelly-rainbow/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Octopus"
      component={OctopusShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "brooding-octopus/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Orca"
      component={OrcaShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "orca-wave-wash/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Angler"
      component={AnglerShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "anglerfish-fusion/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Basket"
      component={BasketShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "basket-star-medusa/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="SeaPen"
      component={SeaPenShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "droopy-sea-pen/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Siphon"
      component={SiphonShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "christmas-tree-siphonophore/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Owlfish"
      component={OwlfishShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "owlfish-eyes/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Blobfish"
      component={BlobfishShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "blobfish-real-face/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="BlobfishThumb" component={BlobfishThumb} width={1080} height={1920} />
    <Composition
      id="GiantSiphon"
      component={GiantSiphonShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "giant-siphonophore-spiral/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="GiantSiphonThumb" component={GiantSiphonThumb} width={1080} height={1920} />
    <Composition
      id="Barreleye"
      component={BarreleyeShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "barreleye-see-through-head/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="BarreleyeThumb" component={BarreleyeThumb} width={1080} height={1920} />
    <Composition
      id="Potoo"
      component={PotooShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "great-potoo-branch/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="PotooThumb" component={PotooThumb} width={1080} height={1920} />
    <Composition
      id="Tarsier"
      component={TarsierShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "tarsier-giant-eyes/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="TarsierThumb" component={TarsierThumb} width={1080} height={1920} />
    <Composition
      id="Sloth"
      component={SlothShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "sloth-poop-trip/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="SlothThumb" component={SlothThumb} width={1080} height={1920} />
    <Composition
      id="RiverDolphin"
      component={RiverDolphinShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "pink-river-dolphin-forest/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="RiverDolphinThumb" component={RiverDolphinThumb} width={1080} height={1920} />
    <Composition
      id="StarMole"
      component={StarMoleShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "star-nosed-mole-fastest/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="StarMoleThumb" component={StarMoleThumb} width={1080} height={1920} />
    <Composition
      id="Komodo"
      component={KomodoShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "komodo-virgin-birth/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="KomodoThumb" component={KomodoThumb} width={1080} height={1920} />
    <Composition
      id="Kangaroo"
      component={KangarooShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "kangaroo-pov-evolution/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="KangarooThumb" component={KangarooThumb} width={1080} height={1920} />
    <Composition
      id="Snail"
      component={SnailShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "snail-sleep-pov/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="SnailThumb" component={SnailThumb} width={1080} height={1920} />
    <Composition
      id="Eel"
      component={EelShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "electric-eel-pov/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="EelThumb" component={EelThumb} width={1080} height={1920} />
    <Composition
      id="BigCats"
      component={BigCatsShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "big-cats-pov/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="BigCatsThumb" component={BigCatsThumb} width={1080} height={1920} />
    <Composition
      id="Seahorse"
      component={SeahorseShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "seahorse-pov/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="SeahorseThumb" component={SeahorseThumb} width={1080} height={1920} />
    <Composition
      id="Owl"
      component={OwlShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "barn-owl-divorce-pov/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="OwlThumb" component={OwlThumb} width={1080} height={1920} />
    <Composition
      id="Buffalo"
      component={BuffaloShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "buffalo-vote-pov/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="BuffaloThumb" component={BuffaloThumb} width={1080} height={1920} />
    <Composition
      id="Lizard"
      component={LizardShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "horned-lizard-pov/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="LizardThumb" component={LizardThumb} width={1080} height={1920} />
    <Still id="Lab" component={Lab} width={1920} height={1080} defaultProps={{ model: "siphon" }} />
    <Still id="BlobfishLab" component={BlobfishLab} width={1920} height={1080} />
    <Still id="CombJellyThumb" component={CombJellyThumb} width={1080} height={1920} />
    <Still id="OctopusThumb" component={OctopusThumb} width={1080} height={1920} />
    <Still id="OrcaThumb" component={OrcaThumb} width={1080} height={1920} />
    <Still id="AnglerThumb" component={AnglerThumb} width={1080} height={1920} />
    <Still id="BasketThumb" component={BasketThumb} width={1080} height={1920} />
    <Still id="SeaPenThumb" component={SeaPenThumb} width={1080} height={1920} />
    <Still id="SiphonThumb" component={SiphonThumb} width={1080} height={1920} />
    <Still id="OwlfishThumb" component={OwlfishThumb} width={1080} height={1920} />
  </>
);
