import type { OauthFlowError } from '@convex-dev/auth/methods/github/react';
import { ConvexError } from 'convex/values';

const PRIVATE_APP = 'Unauthorized: this application is private.';

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
      if (cause instanceof ConvexError && cause.data === PRIVATE_APP) {
        return cause.data;
      }
      return 'Something went wrong during sign-in. Please try again.';
    }
    default:
      flowError satisfies never;
      return `Unknown error: ${JSON.stringify(flowError)}`;
  }
}
