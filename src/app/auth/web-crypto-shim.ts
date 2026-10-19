import { sha256 } from 'js-sha256';

/**
 * Polyfill for window.crypto.subtle in insecure contexts (e.g. plain HTTP on public EC2 IP).
 * Browsers disable window.crypto.subtle on non-localhost HTTP, which crashes @azure/msal-browser
 * with `BrowserAuthError: crypto_nonexistent`.
 * This shim ensures MSAL can always perform PKCE SHA-256 digests even when accessed via HTTP IP.
 */
export function initWebCryptoShim(): void {
  if (typeof window === 'undefined') return;

  // Ensure window.crypto exists
  if (!window.crypto) {
    (window as any).crypto = {};
  }

  // Ensure getRandomValues exists (usually available natively even in HTTP)
  if (!window.crypto.getRandomValues) {
    (window.crypto as any).getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (!array) return array;
      const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }

  // Polyfill window.crypto.subtle if missing (insecure context)
  if (!window.crypto.subtle) {
    const subtleShim = {
      digest: async (algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> => {
        let input: Uint8Array;
        if (data instanceof ArrayBuffer) {
          input = new Uint8Array(data);
        } else if (ArrayBuffer.isView(data)) {
          input = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        } else {
          input = new Uint8Array(0);
        }
        return sha256.arrayBuffer(input);
      }
    };

    try {
      Object.defineProperty(window.crypto, 'subtle', {
        value: subtleShim,
        configurable: true,
        writable: true,
      });
    } catch {
      (window.crypto as any).subtle = subtleShim;
    }
  }
}

// Automatically invoke on module evaluation before MSAL initializes
initWebCryptoShim();
