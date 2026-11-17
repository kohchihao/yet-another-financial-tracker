import { ConvexError } from 'convex/values';
import { describe, expect, test, vi } from 'vitest';
import { githubFlowMessage } from './githubSignInError';

describe('githubFlowMessage', () => {
  test('shows the private-app ConvexError data', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cause = new ConvexError('Unauthorized: this application is private.');
    expect(
      githubFlowMessage({ error: 'OTHER_ERROR', cause }),
    ).toBe('Unauthorized: this application is private.');
  });

  test('keeps the generic text for any other failure', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const generic = 'Something went wrong during sign-in. Please try again.';
    expect(
      githubFlowMessage({ error: 'OTHER_ERROR', cause: new Error('network') }),
    ).toBe(generic);
    expect(
      githubFlowMessage({
        error: 'OTHER_ERROR',
        cause: new ConvexError('something else'),
      }),
    ).toBe(generic);
    expect(
      githubFlowMessage({
        error: 'OTHER_ERROR',
        cause: new ConvexError({ code: 'OTHER' }),
      }),
    ).toBe(generic);
  });
});
