import type { OauthFlowError } from '@convex-dev/auth/methods/github/react';
import { ConvexError } from 'convex/values';
import { PRIVATE_APP_MESSAGE } from '@/convex/authErrors';

export function githubFlowMessage(flowError: OauthFlowError): string {
  switch (flowError.error) {
    case 'ACCESS_DENIED':
      return 'Sign-in was cancelled.';
    case 'EXPIRED':
      return 'That sign-in took too long. Please try again.';
    case 'INVALID_FLOW':
      return "This sign-in can't be completed here. Please try again.";
    case 'OTHER_ERROR': {
      console.error('GitHub sign-in failed:', flowError.cause);
      const { cause } = flowError;
      if (cause instanceof ConvexError && cause.data === PRIVATE_APP_MESSAGE) {
        return cause.data;
      }
      return 'Something went wrong during sign-in. Please try again.';
    }
    default:
      flowError satisfies never;
      return `Unknown error: ${JSON.stringify(flowError)}`;
  }
}
