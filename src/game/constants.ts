export const GAME_SETTINGS = {
  INITIAL_HP: 150,
  PLAYER_HEIGHT: 1.7,
  SPAWN_RANGE: 40,
  MAP_SIZE: 100,
};

export type WeaponType = 'AR' | 'SNIPER';

export interface WeaponStats {
  name: string;
  damage: number;
  fireRate: number; // ms
  dropoff: boolean;
  range: number;
}

export const WEAPONS: Record<WeaponType, WeaponStats> = {
  AR: {
    name: 'Assault Rifle',
    damage: 35,
    fireRate: 150,
    dropoff: true,
    range: 80,
  },
  SNIPER: {
    name: 'Sniper Rifle',
    damage: 130,
    fireRate: 1200,
    dropoff: false,
    range: 500,
  },
};
