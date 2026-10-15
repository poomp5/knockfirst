import { Composition } from "remotion";
import { Film } from "./Film";
import { FPS, TOTAL } from "./theme";

export const Root = () => (
  <>
    <Composition id="KnockFirstFilm" component={Film} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    {/* Same frames at 25 fps = 1.2× slower (72 s), slowed music + voice-over (scripts/make-voiceover.mjs). */}
    <Composition id="KnockFirstFilmVO" component={Film} durationInFrames={TOTAL} fps={25} width={1920} height={1080} defaultProps={{ voiceover: true }} />
  </>
);
