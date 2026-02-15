// Tests for ErrorBoundary component logic (node environment — no DOM rendering)
// Validates: error boundary class structure and state management

import ErrorBoundary from '../../renderer/components/ErrorBoundary';

describe('ErrorBoundary logic', () => {
  describe('static getDerivedStateFromError', () => {
    it('should return state with hasError true and the error', () => {
      const testError = new Error('Test error');
      const result = ErrorBoundary.getDerivedStateFromError(testError);

      expect(result.hasError).toBe(true);
      expect(result.error).toBe(testError);
    });
  });

  describe('class structure', () => {
    it('should be a React Component class', () => {
      expect(typeof ErrorBoundary).toBe('function');
      expect(ErrorBoundary.prototype.render).toBeDefined();
      expect(ErrorBoundary.prototype.componentDidCatch).toBeDefined();
    });

    it('should have getDerivedStateFromError static method', () => {
      expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
    });
  });
});
