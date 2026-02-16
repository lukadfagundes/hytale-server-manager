import { useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { useUpdaterStore } from '../../stores/updater-store';
import { formatBytes, formatSpeed } from '../../utils/formatting';

export default function UpdateNotification() {
  const {
    status,
    updateInfo,
    downloadProgress,
    error,
    dismissed,
    appVersion,
    downloadUpdate,
    installUpdate,
    skipVersion,
    remindLater,
    checkForUpdates,
  } = useUpdaterStore();

  const shouldShow =
    !dismissed &&
    (status === 'available' ||
      status === 'downloading' ||
      status === 'downloaded' ||
      status === 'error');

  const dialogRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (status === 'downloading') {
      remindLater();
    } else if (status === 'available') {
      remindLater();
    } else if (status === 'downloaded') {
      remindLater();
    } else if (status === 'error') {
      remindLater();
    }
  }, [status, remindLater]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!shouldShow) return;

    const dialog = dialogRef.current;
    if (dialog) {
      dialog.focus();
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      // Focus trap: constrain Tab/Shift+Tab to dialog
      if (e.key === 'Tab' && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [shouldShow, handleClose]);

  if (!shouldShow) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-notification-title"
        tabIndex={-1}
        className="bg-hytale-dark border border-hytale-accent/30 rounded-lg w-full max-w-2xl shadow-2xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 id="update-notification-title" className="text-lg font-semibold text-hytale-text">
            {status === 'available' && 'Update Available'}
            {status === 'downloading' && 'Downloading Update'}
            {status === 'downloaded' && 'Update Ready'}
            {status === 'error' && 'Update Error'}
          </h2>
          <button
            onClick={handleClose}
            className="text-hytale-muted hover:text-hytale-text text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-5">
          {status === 'available' && updateInfo && (
            <AvailableContent
              appVersion={appVersion}
              updateInfo={updateInfo}
              onDownload={downloadUpdate}
              onRemind={remindLater}
              onSkip={() => skipVersion(updateInfo.version)}
            />
          )}
          {status === 'downloading' && (
            <DownloadingContent progress={downloadProgress} onBackground={remindLater} />
          )}
          {status === 'downloaded' && (
            <DownloadedContent onInstallLater={remindLater} onInstall={installUpdate} />
          )}
          {status === 'error' && (
            <ErrorContent
              error={error}
              onDismiss={remindLater}
              onRetry={() => {
                useUpdaterStore.setState({ status: 'idle', error: null, dismissed: false });
                checkForUpdates();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AvailableContent({
  appVersion,
  updateInfo,
  onDownload,
  onRemind,
  onSkip,
}: {
  appVersion: string;
  updateInfo: { version: string; releaseDate: string; releaseNotes?: string };
  onDownload: () => void;
  onRemind: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Version badges */}
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded bg-hytale-accent/30 text-sm text-hytale-muted">
          v{appVersion}
        </span>
        <span className="text-hytale-muted">&rarr;</span>
        <span className="px-3 py-1 rounded bg-hytale-highlight/20 text-sm text-hytale-highlight font-medium">
          v{updateInfo.version}
        </span>
      </div>

      {/* Release date */}
      <p className="text-sm text-hytale-muted">
        Released {new Date(updateInfo.releaseDate).toLocaleDateString()}
      </p>

      {/* Release notes */}
      {updateInfo.releaseNotes && (
        <div className="bg-hytale-darker rounded p-4 max-h-96 overflow-auto">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ children }) => (
                <h3 className="text-base font-bold text-hytale-text mt-4 mb-2 first:mt-0">
                  {children}
                </h3>
              ),
              h2: ({ children }) => (
                <h3 className="text-sm font-semibold text-hytale-text mt-3 mb-1">{children}</h3>
              ),
              h3: ({ children }) => (
                <h4 className="text-sm font-semibold text-hytale-text mt-2 mb-1">{children}</h4>
              ),
              p: ({ children }) => (
                <p className="text-sm text-hytale-text/80 leading-relaxed mb-2">{children}</p>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-hytale-highlight hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-0.5 mb-2 text-sm text-hytale-text/80">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-0.5 mb-2 text-sm text-hytale-text/80">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="text-hytale-text/80">{children}</li>,
              code: ({ children }) => (
                <code className="bg-hytale-accent/20 text-hytale-highlight px-1 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-hytale-dark rounded p-3 overflow-x-auto mb-2 text-xs">
                  {children}
                </pre>
              ),
              hr: () => <hr className="border-hytale-accent/30 my-3" />,
              strong: ({ children }) => (
                <strong className="font-semibold text-hytale-text">{children}</strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-hytale-highlight/50 pl-3 italic text-hytale-muted mb-2">
                  {children}
                </blockquote>
              ),
            }}
          >
            {updateInfo.releaseNotes}
          </ReactMarkdown>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onDownload}
          className="w-full py-2 rounded bg-hytale-highlight hover:bg-hytale-highlight/80 text-white font-medium transition-colors"
        >
          Download &amp; Install
        </button>
        <div className="flex gap-2">
          <button
            onClick={onRemind}
            className="flex-1 py-2 rounded bg-hytale-accent/30 hover:bg-hytale-accent/50 text-hytale-text text-sm transition-colors"
          >
            Remind Me Later
          </button>
          <button
            onClick={onSkip}
            className="flex-1 py-2 rounded text-hytale-muted hover:text-hytale-text text-sm transition-colors"
          >
            Skip This Version
          </button>
        </div>
      </div>
    </div>
  );
}

function DownloadingContent({
  progress,
  onBackground,
}: {
  progress: { percent: number; bytesPerSecond: number; transferred: number; total: number } | null;
  onBackground: () => void;
}) {
  const percent = progress ? Math.round(progress.percent) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-hytale-muted mb-2">
          <span>Downloading...</span>
          <span>{percent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-hytale-accent/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-hytale-highlight transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Transfer info */}
      {progress && progress.total > 0 && (
        <p className="text-xs text-hytale-muted text-center">
          {formatBytes(progress.transferred)} / {formatBytes(progress.total)} &bull;{' '}
          {formatSpeed(progress.bytesPerSecond)}
        </p>
      )}

      {/* Action */}
      <button
        onClick={onBackground}
        className="w-full py-2 rounded bg-hytale-accent/30 hover:bg-hytale-accent/50 text-hytale-text text-sm transition-colors"
      >
        Download in Background
      </button>
    </div>
  );
}

function DownloadedContent({
  onInstallLater,
  onInstall,
}: {
  onInstallLater: () => void;
  onInstall: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-hytale-text font-medium">Update Downloaded</p>
          <p className="text-sm text-hytale-muted">
            The application will restart to complete the installation.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onInstallLater}
          className="flex-1 py-2 rounded bg-hytale-accent/30 hover:bg-hytale-accent/50 text-hytale-text text-sm transition-colors"
        >
          Install Later
        </button>
        <button
          onClick={onInstall}
          className="flex-1 py-2 rounded bg-hytale-highlight hover:bg-hytale-highlight/80 text-white font-medium transition-colors"
        >
          Restart &amp; Install
        </button>
      </div>
    </div>
  );
}

function ErrorContent({
  error,
  onDismiss,
  onRetry,
}: {
  error: string | null;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-red-900/30 border border-red-500/30 rounded p-3 max-h-40 overflow-auto">
        <p className="text-sm text-red-300 break-words">
          {error || 'An unknown error occurred while checking for updates.'}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onDismiss}
          className="flex-1 py-2 rounded bg-hytale-accent/30 hover:bg-hytale-accent/50 text-hytale-text text-sm transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={onRetry}
          className="flex-1 py-2 rounded bg-hytale-highlight hover:bg-hytale-highlight/80 text-white font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
