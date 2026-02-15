// Mock IPC client functions before imports
const mockStartServer = jest.fn();
const mockStopServer = jest.fn();
const mockOnServerStatusChanged = jest.fn();
const mockOnServerLog = jest.fn();

jest.mock('../../renderer/services/ipc-client', () => ({
  startServer: (...args: unknown[]) => mockStartServer(...args),
  stopServer: (...args: unknown[]) => mockStopServer(...args),
  onServerStatusChanged: (...args: unknown[]) => mockOnServerStatusChanged(...args),
  onServerLog: (...args: unknown[]) => mockOnServerLog(...args),
}));

// Mock toast store
const mockAddToast = jest.fn();
jest.mock('../../renderer/stores/toast-store', () => ({
  useToastStore: {
    getState: () => ({ addToast: mockAddToast }),
  },
}));

import { useServerStore } from '../../renderer/stores/server-store';

describe('server-store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Reset the zustand store state between tests
    useServerStore.setState({
      status: 'stopped',
      logs: [],
    });
  });

  describe('initial state', () => {
    it('should start with stopped status', () => {
      const state = useServerStore.getState();
      expect(state.status).toBe('stopped');
    });

    it('should start with empty logs', () => {
      const state = useServerStore.getState();
      expect(state.logs).toEqual([]);
    });
  });

  describe('start', () => {
    it('should call startServer IPC function', async () => {
      mockStartServer.mockResolvedValue(undefined);

      await useServerStore.getState().start();

      expect(mockStartServer).toHaveBeenCalled();
    });

    it('should show error toast when startServer throws', async () => {
      mockStartServer.mockRejectedValue(new Error('Server failed to start'));

      await useServerStore.getState().start();

      expect(mockAddToast).toHaveBeenCalledWith(
        'Failed to start server: Server failed to start',
        'error'
      );
    });

    it('should handle non-Error thrown values', async () => {
      mockStartServer.mockRejectedValue('string error');

      await useServerStore.getState().start();

      expect(mockAddToast).toHaveBeenCalledWith('Failed to start server: string error', 'error');
    });
  });

  describe('stop', () => {
    it('should call stopServer IPC function', async () => {
      mockStopServer.mockResolvedValue(undefined);

      await useServerStore.getState().stop();

      expect(mockStopServer).toHaveBeenCalled();
    });

    it('should show error toast when stopServer throws', async () => {
      mockStopServer.mockRejectedValue(new Error('Server failed to stop'));

      await useServerStore.getState().stop();

      expect(mockAddToast).toHaveBeenCalledWith(
        'Failed to stop server: Server failed to stop',
        'error'
      );
    });
  });

  describe('clearLogs', () => {
    it('should reset logs to empty array', () => {
      // Add some logs first
      useServerStore.setState({
        logs: [
          { line: 'test1', stream: 'stdout', timestamp: 1 },
          { line: 'test2', stream: 'stderr', timestamp: 2 },
        ],
      });

      useServerStore.getState().clearLogs();

      expect(useServerStore.getState().logs).toEqual([]);
    });
  });

  describe('init', () => {
    it('should subscribe to onServerStatusChanged', () => {
      const mockUnsub = jest.fn();
      mockOnServerStatusChanged.mockReturnValue(mockUnsub);
      mockOnServerLog.mockReturnValue(jest.fn());

      useServerStore.getState().init();

      expect(mockOnServerStatusChanged).toHaveBeenCalled();
    });

    it('should subscribe to onServerLog', () => {
      const mockUnsub = jest.fn();
      mockOnServerStatusChanged.mockReturnValue(jest.fn());
      mockOnServerLog.mockReturnValue(mockUnsub);

      useServerStore.getState().init();

      expect(mockOnServerLog).toHaveBeenCalled();
    });

    it('should clear logs when status changes to "starting"', () => {
      // Pre-populate logs
      useServerStore.setState({
        logs: [{ line: 'old log', stream: 'stdout', timestamp: 1 }],
      });

      let statusCallback: (status: string) => void;
      mockOnServerStatusChanged.mockImplementation((cb: (status: string) => void) => {
        statusCallback = cb;
        return jest.fn();
      });
      mockOnServerLog.mockReturnValue(jest.fn());

      useServerStore.getState().init();
      statusCallback!('starting');

      expect(useServerStore.getState().status).toBe('starting');
      expect(useServerStore.getState().logs).toEqual([]);
    });

    it('should update status without clearing logs for other status values', () => {
      // Pre-populate logs
      useServerStore.setState({
        logs: [{ line: 'existing log', stream: 'stdout', timestamp: 1 }],
      });

      let statusCallback: (status: string) => void;
      mockOnServerStatusChanged.mockImplementation((cb: (status: string) => void) => {
        statusCallback = cb;
        return jest.fn();
      });
      mockOnServerLog.mockReturnValue(jest.fn());

      useServerStore.getState().init();
      statusCallback!('running');

      expect(useServerStore.getState().status).toBe('running');
      expect(useServerStore.getState().logs).toHaveLength(1);
    });

    it('should append log entries to the log buffer with unique ids', () => {
      mockOnServerStatusChanged.mockReturnValue(jest.fn());

      let logCallback: (entry: { line: string; stream: string; timestamp: number }) => void;
      mockOnServerLog.mockImplementation(
        (cb: (entry: { line: string; stream: string; timestamp: number }) => void) => {
          logCallback = cb;
          return jest.fn();
        }
      );

      useServerStore.getState().init();

      logCallback!({ line: 'first log', stream: 'stdout', timestamp: 1 });
      logCallback!({ line: 'second log', stream: 'stderr', timestamp: 2 });

      const logs = useServerStore.getState().logs;
      expect(logs).toHaveLength(2);
      // Check that each log entry has the original fields plus a unique id
      expect(logs[0]).toMatchObject({ line: 'first log', stream: 'stdout', timestamp: 1 });
      expect(logs[1]).toMatchObject({ line: 'second log', stream: 'stderr', timestamp: 2 });
      expect(typeof logs[0].id).toBe('number');
      expect(typeof logs[1].id).toBe('number');
      expect(logs[0].id).not.toBe(logs[1].id);
    });

    it('should cap log buffer at MAX_LOGS (1000) entries', () => {
      mockOnServerStatusChanged.mockReturnValue(jest.fn());

      let logCallback: (entry: { line: string; stream: string; timestamp: number }) => void;
      mockOnServerLog.mockImplementation(
        (cb: (entry: { line: string; stream: string; timestamp: number }) => void) => {
          logCallback = cb;
          return jest.fn();
        }
      );

      useServerStore.getState().init();

      // Add 1005 log entries
      for (let i = 0; i < 1005; i++) {
        logCallback!({ line: `log ${i}`, stream: 'stdout', timestamp: i });
      }

      const logs = useServerStore.getState().logs;
      expect(logs).toHaveLength(1000);
      // Should have sliced off the oldest 5
      expect(logs[0].line).toBe('log 5');
      expect(logs[999].line).toBe('log 1004');
    });

    it('should return cleanup function that unsubscribes both listeners', () => {
      const mockUnsubStatus = jest.fn();
      const mockUnsubLog = jest.fn();
      mockOnServerStatusChanged.mockReturnValue(mockUnsubStatus);
      mockOnServerLog.mockReturnValue(mockUnsubLog);

      const cleanup = useServerStore.getState().init();
      cleanup();

      expect(mockUnsubStatus).toHaveBeenCalled();
      expect(mockUnsubLog).toHaveBeenCalled();
    });
  });

  describe('status transitions', () => {
    let statusCallback: (status: string) => void;

    beforeEach(() => {
      mockOnServerStatusChanged.mockImplementation((cb: (status: string) => void) => {
        statusCallback = cb;
        return jest.fn();
      });
      mockOnServerLog.mockReturnValue(jest.fn());
      useServerStore.getState().init();
    });

    it('should transition to "stopped" status', () => {
      statusCallback('stopped');
      expect(useServerStore.getState().status).toBe('stopped');
    });

    it('should transition to "starting" status', () => {
      statusCallback('starting');
      expect(useServerStore.getState().status).toBe('starting');
    });

    it('should transition to "running" status', () => {
      statusCallback('running');
      expect(useServerStore.getState().status).toBe('running');
    });

    it('should transition to "stopping" status', () => {
      statusCallback('stopping');
      expect(useServerStore.getState().status).toBe('stopping');
    });
  });
});
