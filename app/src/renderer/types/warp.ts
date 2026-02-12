import type { Position } from './player';

export interface Warp {
  id: string;
  world: string;
  creator: string;
  createdAt: number;
  position: Position;
  yaw: number;
}
