import {
  Bird,
  CloudSun,
  Droplets,
  Earth,
  Flower2,
  Globe2,
  Leaf,
  Mountain,
  Recycle,
  Sprout,
  Sun,
  TreeDeciduous,
  TreePine,
  Trees,
  Wind,
} from 'lucide-react';

export interface LevelTier {
  level: number;
  name: string;
  icon: typeof Sprout;
}

/** Environment-themed rank names and icons for the level ladder. */
export const LEVEL_TIERS: LevelTier[] = [
  {level: 1, name: 'Csíra', icon: Sprout},
  {level: 2, name: 'Hajtás', icon: Leaf},
  {level: 3, name: 'Csemete', icon: TreeDeciduous},
  {level: 4, name: 'Lombkorona-őr', icon: TreePine},
  {level: 5, name: 'Erdőőrző', icon: Trees},
  {level: 6, name: 'Vízvédő', icon: Droplets},
  {level: 7, name: 'Napgyűjtő', icon: Sun},
  {level: 8, name: 'Széljárta', icon: Wind},
  {level: 9, name: 'Újrahasznosító', icon: Recycle},
  {level: 10, name: 'Földbarát', icon: Earth},
  {level: 11, name: 'Klímahős', icon: CloudSun},
  {level: 12, name: 'Bolygóvédő', icon: Globe2},
  {level: 13, name: 'Madárbarát', icon: Bird},
  {level: 14, name: 'Hegyőr', icon: Mountain},
  {level: 15, name: 'Természetőr', icon: Flower2},
];

export function getLevelTier(level: number): LevelTier | undefined {
  return LEVEL_TIERS.find((tier) => tier.level === level);
}
