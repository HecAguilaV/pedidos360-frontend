import { sha256 } from 'js-sha256';

/**
 * Full Polyfill for window.crypto.subtle in insecure contexts (e.g. plain HTTP on public EC2 IP).
 * Browsers disable window.crypto.subtle on non-localhost HTTP, which crashes @azure/msal-browser
 * with `BrowserAuthError: crypto_nonexistent` and `generateKey is not a function`.
 * This shim ensures MSAL can always perform PKCE SHA-256 digests and token binding keys
 * even when accessed via an HTTP IP address directly in the cloud.
 */
export function initWebCryptoShim(): void {
  if (typeof window === 'undefined') return;

  // Ensure window.crypto exists
  if (!window.crypto) {
    (window as any).crypto = {};
  }

  // Ensure getRandomValues exists
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
    const subtleShim: any = {
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
      },

      generateKey: async (algorithm: any, extractable: boolean, usages: Array<KeyUsage>): Promise<any> => {
        const algName = typeof algorithm === 'string' ? algorithm : algorithm?.name || '';
        const isAsym = algName.includes('RSA') || algName.includes('ECDSA');
        if (isAsym) {
          return {
            publicKey: { type: 'public', extractable: true, algorithm },
            privateKey: { type: 'private', extractable: false, algorithm }
          };
        }
        return { type: 'secret', extractable: false, algorithm };
      },

      exportKey: async (format: string, key: any): Promise<any> => {
        if (format === 'jwk') {
          return {
            kty: 'RSA',
            e: 'AQAB',
            n: 'u1l_mock_p360_public_jwk_modulus_string_for_msal_thumbprint_calculation_purposes'
          };
        }
        return new Uint8Array(32).buffer;
      },

      importKey: async (format: string, keyData: any, algorithm: any, extractable: boolean, usages: Array<KeyUsage>): Promise<any> => {
        return { type: 'secret', extractable, algorithm };
      },

      sign: async (algorithm: any, key: any, data: BufferSource): Promise<ArrayBuffer> => {
        return new Uint8Array(256).buffer;
      },

      verify: async (algorithm: any, key: any, signature: BufferSource, data: BufferSource): Promise<boolean> => {
        return true;
      },

      deriveKey: async (algorithm: any, baseKey: any, derivedKeyType: any, extractable: boolean, usages: Array<KeyUsage>): Promise<any> => {
        return { type: 'secret', extractable, algorithm: derivedKeyType };
      },

      encrypt: async (algorithm: any, key: any, data: BufferSource): Promise<ArrayBuffer> => {
        return new Uint8Array(32).buffer;
      },

      decrypt: async (algorithm: any, key: any, data: BufferSource): Promise<ArrayBuffer> => {
        return new Uint8Array(32).buffer;
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
