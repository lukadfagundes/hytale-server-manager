import fs from 'fs';
import path from 'path';

export interface Warp {
  id: string;
  world: string;
  creator: string;
  createdAt: string;
  position: { x: number; y: number; z: number };
  yaw: number;
}

export interface WarpsResult {
  data: Warp[];
  error: string | null;
}

export function readWarps(serverDir: string): WarpsResult {
  const filePath = path.join(serverDir, 'universe', 'warps.json');

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const warps = data.Warps ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: Warp[] = warps.map((w: any) => ({
      id: w.Id ?? '',
      world: w.World ?? '',
      creator: w.Creator ?? '',
      createdAt: w.CreationDate ?? '',
      position: { x: w.X ?? 0, y: w.Y ?? 0, z: w.Z ?? 0 },
      yaw: w.Yaw ?? 0,
    }));

    return { data: parsed, error: null };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { data: [], error: null };
    }
    const msg = err instanceof SyntaxError
      ? `Failed to parse warps.json: ${err.message}`
      : `Failed to read warps.json: ${(err as Error).message}`;
    return { data: [], error: msg };
  }
}
