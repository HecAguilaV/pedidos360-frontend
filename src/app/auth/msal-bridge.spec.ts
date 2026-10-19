import { isMsalAuthResponse } from './msal-bridge';

describe('isMsalAuthResponse', () => {
  it('detects the Entra ID popup response in the URL fragment', () => {
    expect(isMsalAuthResponse('#code=abc123&client_info=xyz&state=eyJpZCI6IjEifQ', '')).toBe(true);
  });

  it('detects an Entra ID error response so the popup can close cleanly', () => {
    expect(isMsalAuthResponse('#error=access_denied&state=eyJpZCI6IjEifQ', '')).toBe(true);
  });

  it('detects a query-string response when response_mode=query is used', () => {
    expect(isMsalAuthResponse('', '?code=abc123&state=eyJpZCI6IjEifQ')).toBe(true);
  });

  it('does not hijack the Cognito Hosted UI callback (code without state)', () => {
    expect(isMsalAuthResponse('', '?code=cognito-auth-code')).toBe(false);
  });

  it('boots the SPA normally on regular navigation', () => {
    expect(isMsalAuthResponse('', '')).toBe(false);
    expect(isMsalAuthResponse('', '?returnUrl=checkout')).toBe(false);
    expect(isMsalAuthResponse('#section', '')).toBe(false);
  });
});
