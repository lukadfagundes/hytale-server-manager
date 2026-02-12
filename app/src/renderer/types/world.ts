import type { Position } from './player';

export interface RegionInfo {
  x: number;
  z: number;
  sizeBytes: number;
  lastModified: number;
}

export interface MapMarker {
  id: string;
  name: string;
  icon: string;
  position: Position;
}

export interface WorldMapData {
  regions: RegionInfo[];
  markers: MapMarker[];
  playerPositions: { name: string; position: Position }[];
  warpPositions: { name: string; position: Position }[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}
