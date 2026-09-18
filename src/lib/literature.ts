export type Scene = {
  id: string;
  title: string;
  place: string;
  reentry: string;
  prompt: string;
  wash?: string;
};

export type Breath = {
  id: string;
  sceneId: string;
  text: string;
};

export type Work = {
  id: string;
  title: string;
  author: string;
  year: string;
  note: string;
  minutes: number;
  cover: string;
  coverAlt: string;
  scenes: Scene[];
  breaths: Breath[];
};

export function breathsFor(sceneId: string, lines: string[]): Breath[] {
  return lines.map((text, i) => ({
    id: `${sceneId}-${i}`,
    sceneId,
    text,
  }));
}
