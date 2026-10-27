import { p256 } from '@noble/curves/nist.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

const KEY_STORAGE = 'mdoc_ec_keypair_v1';

interface ECKeyPair {
  privateKeyHex: string;
  publicKeyHex: string;
}

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlStr(str: string): string {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getOrCreateKeyPair(): Promise<ECKeyPair> {
  const stored = await AsyncStorage.getItem(KEY_STORAGE);
  if (stored) return JSON.parse(stored);
  const privBytes = p256.utils.randomSecretKey();
  const pubBytes = p256.getPublicKey(privBytes, false); // uncompressed 04|x|y
  const kp: ECKeyPair = {
    privateKeyHex: Buffer.from(privBytes).toString('hex'),
    publicKeyHex: Buffer.from(pubBytes).toString('hex'),
  };
  await AsyncStorage.setItem(KEY_STORAGE, JSON.stringify(kp));
  return kp;
}

function pubToJwk(pubHex: string) {
  const pub = Buffer.from(pubHex, 'hex'); // 65 bytes: 04|x(32)|y(32)
  return {
    kty: 'EC',
    crv: 'P-256',
    x: b64url(pub.slice(1, 33)),
    y: b64url(pub.slice(33, 65)),
  };
}

async function getNonce(accessToken: string): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync('c_nonce');
    if (stored) return stored;
  } catch {}
  try {
    const parts = accessToken.split('.');
    if (parts.length === 3) {
      const padded = parts[1] + '='.repeat((4 - parts[1].length % 4) % 4);
      const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      if (decoded.c_nonce) return decoded.c_nonce;
      if (decoded.nonce)   return decoded.nonce;
    }
  } catch {}
  return `nonce-${Date.now()}`;
}

export async function buildMdocProofJwt(
  accessToken: string,
  issuer: { client_id?: string; id?: string; credential_issuer?: string; issuerUrl?: string }
): Promise<string> {
  const kp  = await getOrCreateKeyPair();
  const now = Math.floor(Date.now() / 1000);

  const header = {
    typ: 'openid4vci-proof+jwt',
    alg: 'ES256',
    jwk: pubToJwk(kp.publicKeyHex),
  };

  const payload = {
    iss:   process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID ?? issuer.client_id ?? issuer.id,
    nonce: await getNonce(accessToken),
    aud:   issuer.credential_issuer || issuer.issuerUrl,
    iat:   now,
    exp:   now + 18000,
  };

  const h = b64urlStr(JSON.stringify(header));
  const p = b64urlStr(JSON.stringify(payload));
  const signingInput = `${h}.${p}`;

  console.log('[MdocProof] header:', JSON.stringify(header));
  console.log('[MdocProof] payload:', JSON.stringify(payload));

  const privBytes = Uint8Array.from(Buffer.from(kp.privateKeyHex, 'hex'));
  const sigBytes = p256.sign(new TextEncoder().encode(signingInput), privBytes, { lowS: true, prehash: true }); // r||s 64 bytes (IEEE P1363, formato correto para JWT ES256)

  const jwt = `${signingInput}.${b64url(sigBytes)}`;
  console.log('[MdocProof] JWT:', jwt);
  return jwt;
}
