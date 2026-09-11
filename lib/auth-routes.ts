export const publicAuthPaths = ["/login", "/signup", "/forgot-password", "/auth/callback", "/api/auth/signup"] as const;

export function isPublicAuthPath(pathname: string) {
  return publicAuthPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getCallbackDestination(requestUrl: string, succeeded: boolean) {
  const url = new URL(requestUrl);
  return new URL(succeeded ? "/onboarding" : "/login?error=Unable%20to%20complete%20authentication.%20Please%20try%20again.", url.origin);
}
