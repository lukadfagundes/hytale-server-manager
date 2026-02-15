import { useState, useEffect } from 'react';
import { getItemIconPath } from '../../utils/asset-paths';
import { formatItemId } from '../../utils/translation';
import { useAssetStore } from '../../stores/asset-store';

interface ItemIconProps {
  itemId: string;
  className?: string;
}

export default function ItemIcon({ itemId, className = '' }: ItemIconProps) {
  const [imgError, setImgError] = useState(false);
  const iconMapReady = useAssetStore((s) => s.iconMapReady);

  // Reset error state when icon map reloads (e.g., after re-extraction)
  useEffect(() => {
    if (iconMapReady) {
      setImgError(false);
    }
  }, [iconMapReady]);

  if (!itemId || imgError) {
    return (
      <span
        className={`text-[10px] text-hytale-text leading-tight text-center break-words ${className}`}
      >
        {formatItemId(itemId)}
      </span>
    );
  }

  if (!iconMapReady) return null;

  return (
    <img
      src={getItemIconPath(itemId)}
      alt={formatItemId(itemId)}
      className={`w-full h-full object-contain ${className}`}
      onError={() => setImgError(true)}
    />
  );
}
