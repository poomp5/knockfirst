import { Composition } from "remotion";
import { Film } from "./Film";
import { FPS, TOTAL } from "./theme";

export const Root = () => (
  <Composition id="KnockFirstFilm" component={Film} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
