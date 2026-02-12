import { useState } from 'react';
import { getMapMarkerPath } from '../../utils/asset-paths';

interface MapMarkerIconProps {
  type: 'player' | 'warp' | 'marker';
  name: string;
  icon?: string;
  size?: number;
}

const FALLBACK_COLORS: Record<string, string> = {
  player: 'bg-green-400 border-green-600',
  warp: 'bg-purple-400 border-purple-600',
  marker: 'bg-yellow-400 border-yellow-600',
};

function getMarkerFilename(type: string, icon?: string): string {
  if (type === 'player') return 'Player';
  if (type === 'warp') return 'Warp';
  return icon ?? 'Marker';
}

export default function MapMarkerIcon({ type, name, icon, size = 16 }: MapMarkerIconProps) {
  const [imgError, setImgError] = useState(false);
  const filename = getMarkerFilename(type, icon);

  if (imgError) {
    return (
      <div
        className={`rounded-full border ${FALLBACK_COLORS[type]}`}
        style={{ width: size * 0.5, height: size * 0.5 }}
        title={name}
      />
    );
  }

  return (
    <img
      src={getMapMarkerPath(filename)}
      alt={name}
      width={size}
      height={size}
      className="object-contain"
      title={name}
      onError={() => setImgError(true)}
    />
  );
}
