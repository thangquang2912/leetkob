import type { Principal, TokenVerifier } from './types.js';

export function extractBearerToken(
  authorizationHeader: string | string[] | undefined
): string | undefined {
  if (typeof authorizationHeader !== 'string') {
    return undefined;
  }
  const trimmed = authorizationHeader.trim();
  const match = /^Bearer\s+(\S+)$/.exec(trimmed);
  if (!match || !match[1]) {
    return undefined;
  }
  return match[1];
}

export function createMapTokenVerifier(tokenMap: ReadonlyMap<string, Principal>): TokenVerifier {
  return (token: string): Principal | undefined => {
    return tokenMap.get(token);
  };
}
