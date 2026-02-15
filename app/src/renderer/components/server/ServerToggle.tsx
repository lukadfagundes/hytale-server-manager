import { useServerStore } from '../../stores/server-store';

export default function ServerToggle() {
  const status = useServerStore((s) => s.status);
  const start = useServerStore((s) => s.start);
  const stop = useServerStore((s) => s.stop);
  const isTransitioning = status === 'starting' || status === 'stopping';
  const isRunning = status === 'running';

  const handleClick = () => {
    if (isTransitioning) return;
    if (isRunning) {
      stop();
    } else {
      start();
    }
  };

  const buttonColor = isRunning
    ? 'bg-red-600 hover:bg-red-700'
    : isTransitioning
      ? 'bg-yellow-600 cursor-not-allowed'
      : 'bg-green-600 hover:bg-green-700';

  const label = isRunning
    ? 'Stop Server'
    : status === 'starting'
      ? 'Starting...'
      : status === 'stopping'
        ? 'Stopping...'
        : 'Start Server';

  return (
    <button
      onClick={handleClick}
      disabled={isTransitioning}
      className={`${buttonColor} text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors shadow-lg`}
    >
      {label}
    </button>
  );
}
