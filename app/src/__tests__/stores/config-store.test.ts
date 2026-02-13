// Mock the IPC client functions
const mockGetServerPath = jest.fn();
const mockSetServerPath = jest.fn();
const mockSelectServerDir = jest.fn();
const mockOnServerPathChanged = jest.fn();

jest.mock('../../renderer/services/ipc-client', () => ({
  getServerPath: (...args: any[]) => mockGetServerPath(...args),
  setServerPath: (...args: any[]) => mockSetServerPath(...args),
  selectServerDir: (...args: any[]) => mockSelectServerDir(...args),
  onServerPathChanged: (...args: any[]) => mockOnServerPathChanged(...args),
}));

// Mock toast store
const mockAddToast = jest.fn();
jest.mock('../../renderer/stores/toast-store', () => ({
  useToastStore: {
    getState: () => ({ addToast: mockAddToast }),
  },
}));

import { useConfigStore } from '../../renderer/stores/config-store';

describe('config-store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Reset the zustand store state between tests
    useConfigStore.setState({
      status: 'loading',
      serverPath: '',
      selectedPath: '',
      selectedValid: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should start with loading status', () => {
      const state = useConfigStore.getState();
      expect(state.status).toBe('loading');
      expect(state.serverPath).toBe('');
      expect(state.selectedPath).toBe('');
      expect(state.selectedValid).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('init', () => {
    it('should fetch server path and set valid status', async () => {
      mockGetServerPath.mockResolvedValue({ path: '/test/Server', valid: true });
      const mockUnsub = jest.fn();
      mockOnServerPathChanged.mockReturnValue(mockUnsub);

      const cleanup = useConfigStore.getState().init();

      // Wait for the async getServerPath to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      const state = useConfigStore.getState();
      expect(state.status).toBe('valid');
      expect(state.serverPath).toBe('/test/Server');
      expect(mockOnServerPathChanged).toHaveBeenCalled();

      // Cleanup should call unsub
      cleanup();
      expect(mockUnsub).toHaveBeenCalled();
    });

    it('should set invalid status when path is not valid', async () => {
      mockGetServerPath.mockResolvedValue({ path: '/bad/path', valid: false });
      mockOnServerPathChanged.mockReturnValue(jest.fn());

      useConfigStore.getState().init();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(useConfigStore.getState().status).toBe('invalid');
    });

    it('should set invalid status when getServerPath fails', async () => {
      mockGetServerPath.mockRejectedValue(new Error('IPC error'));
      mockOnServerPathChanged.mockReturnValue(jest.fn());

      useConfigStore.getState().init();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(useConfigStore.getState().status).toBe('invalid');
    });

    it('should update state when onServerPathChanged fires', async () => {
      mockGetServerPath.mockResolvedValue({ path: '/initial', valid: true });
      let pathChangedCallback: (info: any) => void;
      mockOnServerPathChanged.mockImplementation((cb) => {
        pathChangedCallback = cb;
        return jest.fn();
      });

      useConfigStore.getState().init();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Simulate path change event from main process
      pathChangedCallback!({ path: '/new/Server', valid: true });

      const state = useConfigStore.getState();
      expect(state.serverPath).toBe('/new/Server');
      expect(state.status).toBe('valid');
    });
  });

  describe('selectDirectory', () => {
    it('should update selectedPath when a valid directory is selected', async () => {
      mockSelectServerDir.mockResolvedValue({ selected: true, path: '/chosen/Server', valid: true });

      await useConfigStore.getState().selectDirectory();

      const state = useConfigStore.getState();
      expect(state.selectedPath).toBe('/chosen/Server');
      expect(state.selectedValid).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set error when selected directory is invalid', async () => {
      mockSelectServerDir.mockResolvedValue({ selected: true, path: '/empty/dir', valid: false });

      await useConfigStore.getState().selectDirectory();

      const state = useConfigStore.getState();
      expect(state.selectedPath).toBe('/empty/dir');
      expect(state.selectedValid).toBe(false);
      expect(state.error).toContain('does not appear to be a valid');
    });

    it('should not update state when dialog is canceled', async () => {
      mockSelectServerDir.mockResolvedValue({ selected: false });

      await useConfigStore.getState().selectDirectory();

      const state = useConfigStore.getState();
      expect(state.selectedPath).toBe('');
      expect(state.selectedValid).toBe(false);
    });

    it('should set error when IPC call fails', async () => {
      mockSelectServerDir.mockRejectedValue(new Error('Dialog failed'));

      await useConfigStore.getState().selectDirectory();

      expect(useConfigStore.getState().error).toBe('Dialog failed');
    });

    it('should clear previous error before selecting', async () => {
      useConfigStore.setState({ error: 'previous error' });
      mockSelectServerDir.mockResolvedValue({ selected: false });

      await useConfigStore.getState().selectDirectory();

      expect(useConfigStore.getState().error).toBeNull();
    });
  });

  describe('confirmPath', () => {
    it('should set server path and transition to valid on success', async () => {
      useConfigStore.setState({ selectedPath: '/chosen/Server', selectedValid: true });
      mockSetServerPath.mockResolvedValue({ success: true });

      await useConfigStore.getState().confirmPath();

      const state = useConfigStore.getState();
      expect(state.status).toBe('valid');
      expect(state.serverPath).toBe('/chosen/Server');
      expect(state.selectedPath).toBe('');
      expect(state.selectedValid).toBe(false);
    });

    it('should set error when setServerPath returns failure', async () => {
      useConfigStore.setState({ selectedPath: '/bad/path' });
      mockSetServerPath.mockResolvedValue({ success: false, error: 'Invalid directory' });

      await useConfigStore.getState().confirmPath();

      expect(useConfigStore.getState().error).toBe('Invalid directory');
      expect(useConfigStore.getState().status).toBe('loading'); // unchanged from initial
    });

    it('should do nothing when selectedPath is empty', async () => {
      useConfigStore.setState({ selectedPath: '' });

      await useConfigStore.getState().confirmPath();

      expect(mockSetServerPath).not.toHaveBeenCalled();
    });

    it('should show toast and set error when IPC call throws', async () => {
      useConfigStore.setState({ selectedPath: '/some/path' });
      mockSetServerPath.mockRejectedValue(new Error('Network error'));

      await useConfigStore.getState().confirmPath();

      expect(useConfigStore.getState().error).toBe('Network error');
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.stringContaining('Network error'),
        'error',
      );
    });

    it('should set generic error message when IPC returns failure without error string', async () => {
      useConfigStore.setState({ selectedPath: '/some/path' });
      mockSetServerPath.mockResolvedValue({ success: false });

      await useConfigStore.getState().confirmPath();

      expect(useConfigStore.getState().error).toBe('Failed to set server path');
    });
  });
});
