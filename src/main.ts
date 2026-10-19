import './app/auth/web-crypto-shim';
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { isMsalAuthResponse } from './app/auth/msal-bridge';

if (isMsalAuthResponse(window.location.hash, window.location.search)) {
  // This window is the Entra ID popup landing on redirectUri. Relay the
  // response to the main window and do NOT boot the SPA here.
  import('@azure/msal-browser/redirect-bridge')
    .then(({ broadcastResponseToMainFrame }) => broadcastResponseToMainFrame())
    .catch((err) => console.error('[P360-AUTH] MSAL redirect bridge failed', err));
} else {
  bootstrapApplication(App, appConfig).catch((err) => console.error(err));
}
