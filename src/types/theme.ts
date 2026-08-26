export interface ThemeDefinition {
  id: string;
  name: string;
  factionId: string;
  tagline: string;
  primaryColor: string;
  primaryHover: string;
  surfaceColor: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  iconName: 'Shield' | 'Skull' | 'Flame' | 'Cross' | 'Crown' | 'Biohazard';
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'iron-sanctum',
    name: 'Iron Sanctum',
    factionId: 'new-antioch',
    tagline: 'New Antioch — Sacred Gold & Dieselpunk Iron',
    primaryColor: '#D4AF37',
    primaryHover: '#E5C158',
    surfaceColor: '#161920',
    bgColor: '#0C0E12',
    borderColor: '#323846',
    accentColor: '#8B0000',
    iconName: 'Shield'
  },
  {
    id: 'heretic-legion',
    name: 'Heretic Legion',
    factionId: 'heretic-legions',
    tagline: 'Heretic Legions — Brimstone, Ash & Hellfire',
    primaryColor: '#FF5625',
    primaryHover: '#FF764D',
    surfaceColor: '#1C1B1B',
    bgColor: '#131313',
    borderColor: '#5D4038',
    accentColor: '#920703',
    iconName: 'Skull'
  },
  {
    id: 'iron-wall-sultanate',
    name: 'Iron Wall Sultanate',
    factionId: 'iron-sultanate',
    tagline: 'Iron Sultanate — Alchemical Lapis & Golden Brass',
    primaryColor: '#76D6D5',
    primaryHover: '#A0F0EF',
    surfaceColor: '#111820',
    bgColor: '#0A0F14',
    borderColor: '#2E3F4E',
    accentColor: '#E9C349',
    iconName: 'Flame'
  },
  {
    id: 'penitent-trench',
    name: 'Penitent Trench',
    factionId: 'trench-pilgrims',
    tagline: 'Trench Pilgrims — Martyr Bone, Ash & Holy Blood',
    primaryColor: '#E4E4CC',
    primaryHover: '#FFFFF0',
    surfaceColor: '#1A1714',
    bgColor: '#100E0C',
    borderColor: '#47473F',
    accentColor: '#8F191D',
    iconName: 'Cross'
  },
  {
    id: 'principality-of-hell',
    name: 'Principality of Hell',
    factionId: 'court-seven-serpents',
    tagline: 'Court of 7 Serpents — Tyrian Purple & Sulfur Flame',
    primaryColor: '#FF5540',
    primaryHover: '#FF7E6E',
    surfaceColor: '#221210',
    bgColor: '#170908',
    borderColor: '#603E39',
    accentColor: '#DDB7FF',
    iconName: 'Crown'
  },
  {
    id: 'black-grail',
    name: 'The Black Grail',
    factionId: 'black-grail',
    tagline: 'The Order of the Fly — Putrid Bile & Rotting Mire',
    primaryColor: '#8BC34A',
    primaryHover: '#9CCC65',
    surfaceColor: '#141C13',
    bgColor: '#0C120B',
    borderColor: '#334531',
    accentColor: '#795548',
    iconName: 'Biohazard'
  }
];
