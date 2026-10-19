/**
 * MSAL Browser v5 redirect bridge detection.
 *
 * Since v5, loginPopup no longer reads the popup URL from the opener window.
 * The page loaded at `redirectUri` must call `broadcastResponseToMainFrame()`
 * so the authorization response reaches the main window via BroadcastChannel.
 *
 * If the full Angular app boots inside the popup instead, the router sends it
 * to the default route (the catalog), the main window never receives the
 * response, and the role-based redirect after login never runs.
 *
 * Entra ID returns the SPA response in the URL fragment by default
 * (`#code=...&state=...` or `#error=...&state=...`). The `state` parameter is
 * always present in MSAL responses, while the Cognito Hosted UI flow used in
 * this app returns `?code=` without `state`, so both flows never collide.
 */
export function isMsalAuthResponse(hash: string, search: string): boolean {
  return hasAuthPayload(hash) || hasAuthPayload(search);
}

function hasAuthPayload(fragment: string): boolean {
  if (!fragment) return false;
  const params = new URLSearchParams(fragment.replace(/^[#?]/, ''));
  if (!params.has('state')) return false;
  return params.has('code') || params.has('error');
}
