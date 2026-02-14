import { useState, useEffect } from 'react';
import { getItemIconPath, reloadIconMap } from '../../utils/asset-paths';
import { formatItemId } from '../../utils/translation';
import { useAssetStore } from '../../stores/asset-store';

interface ItemIconProps {
  itemId: string;
  className?: string;
}

export default function ItemIcon({ itemId, className = '' }: ItemIconProps) {
  const [imgError, setImgError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const assetStatus = useAssetStore((s) => s.status);

  // Load or reload the icon map when assets become ready
  useEffect(() => {
    if (assetStatus === 'ready') {
      reloadIconMap().then(() => {
        setMapLoaded(true);
        setImgError(false);
      });
    }
  }, [assetStatus]);

  if (!itemId || imgError) {
    return (
      <span
        className={`text-[10px] text-hytale-text leading-tight text-center break-words ${className}`}
      >
        {formatItemId(itemId)}
      </span>
    );
  }

  if (!mapLoaded) return null;

  return (
    <img
      src={getItemIconPath(itemId)}
      alt={formatItemId(itemId)}
      className={`w-full h-full object-contain ${className}`}
      onError={() => setImgError(true)}
    />
  );
}
