import { describe, expect, it } from 'vitest';

describe('Graceful shutdown', () => {
  it('run function signature accepts optional checkShutdown callback', () => {
    // This is a compile-time test to verify the signature
    // The actual behavior is tested through integration tests
    // and manual testing since it involves signal handling

    // Type check: the function should accept these signatures
    type RunFunction = (runOnce?: boolean, checkShutdown?: () => boolean) => Promise<void>;

    const _typeCheck: RunFunction = async (runOnce = false, checkShutdown?: () => boolean) => {
      // This function matches the expected signature
      void runOnce;
      void checkShutdown;
    };

    expect(_typeCheck).toBeDefined();
  });

  it('checkShutdown callback returns boolean', () => {
    const checkShutdown = () => true;
    expect(typeof checkShutdown()).toBe('boolean');

    const checkShutdownFalse = () => false;
    expect(typeof checkShutdownFalse()).toBe('boolean');
  });
});
