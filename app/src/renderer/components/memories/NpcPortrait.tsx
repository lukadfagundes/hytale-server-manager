import { useState } from 'react';
import { getNpcPortraitPath } from '../../utils/asset-paths';

interface NpcPortraitProps {
  npcRole: string;
  displayName: string;
  size?: number;
}

export default function NpcPortrait({ npcRole, displayName, size = 48 }: NpcPortraitProps) {
  const [imgError, setImgError] = useState(false);
  const letter = (displayName || npcRole || '?').charAt(0).toUpperCase();

  if (!npcRole || imgError) {
    return (
      <div
        className="rounded-full bg-hytale-accent/40 flex items-center justify-center text-hytale-text font-bold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        title={npcRole}
      >
        {letter}
      </div>
    );
  }

  return (
    <img
      src={getNpcPortraitPath(npcRole)}
      alt={displayName}
      width={size}
      height={size}
      className="rounded-full border border-hytale-accent/40 object-cover flex-shrink-0"
      title={npcRole}
      onError={() => setImgError(true)}
    />
  );
}
