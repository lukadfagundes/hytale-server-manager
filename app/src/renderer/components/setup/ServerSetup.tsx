import { useConfigStore } from '../../stores/config-store';

export default function ServerSetup() {
  const { selectedPath, selectedValid, error, selectDirectory, confirmPath } = useConfigStore();

  return (
    <div className="flex h-screen items-center justify-center bg-hytale-darker">
      <div className="w-full max-w-lg mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-hytale-highlight mb-2">
            Hytale Server Manager
          </h1>
          <p className="text-hytale-muted text-sm">
            Select your Hytale Server directory to get started
          </p>
        </div>

        <div className="bg-hytale-dark rounded-lg border border-hytale-accent/30 p-6">
          <h2 className="text-lg font-semibold text-hytale-text mb-4">
            Server Directory
          </h2>
          <p className="text-sm text-hytale-muted mb-6">
            Browse to the folder containing your HytaleServer.jar and config.json files.
          </p>

          <button
            onClick={selectDirectory}
            className="w-full py-3 px-4 bg-hytale-accent hover:bg-hytale-accent/80 text-hytale-text rounded transition-colors text-sm font-medium"
          >
            Browse for Server Directory
          </button>

          {selectedPath && (
            <div className="mt-4">
              <div className="flex items-start gap-2 bg-hytale-darker rounded px-3 py-2 border border-hytale-accent/20">
                <span className={`mt-0.5 text-xs ${selectedValid ? 'text-green-400' : 'text-yellow-400'}`}>
                  {selectedValid ? 'Valid' : 'Invalid'}
                </span>
                <span className="text-xs text-hytale-muted break-all font-mono">{selectedPath}</span>
              </div>

              {selectedValid && (
                <button
                  onClick={confirmPath}
                  className="w-full mt-3 py-3 px-4 bg-hytale-highlight hover:bg-hytale-highlight/80 text-white rounded transition-colors text-sm font-bold"
                >
                  Continue
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 text-xs text-red-400">{error}</p>
          )}
        </div>

        <p className="text-center text-xs text-hytale-muted mt-6">
          The directory should contain HytaleServer.jar, config.json, or a universe/ folder.
        </p>
      </div>
    </div>
  );
}
