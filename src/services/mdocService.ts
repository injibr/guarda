import { VCSDK } from '@br.gov.dataprev.inji/wallet-sdk';
import { buildMdocProofJwt } from './mdocProofService';

function generateId(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export async function downloadMdocCredential(
  issuer: any,
  credentialType: any,
  accessToken: string
): Promise<any> {
  const doctype =
    credentialType.fullConfig?.doctype ??
    credentialType.doctype ??
    credentialType.id;

  const credentialEndpoint =
    issuer.credential_endpoint ??
    `${issuer.issuerUrl}/issuance/credential`;

  const proofJwt = await buildMdocProofJwt(accessToken, issuer);

  const requestBody = {
    format: 'mso_mdoc',
    doctype,
    proof: { proof_type: 'jwt', jwt: proofJwt },
  };

  console.log('[MdocService] POST', credentialEndpoint, '| doctype:', doctype);

  const response = await fetch(credentialEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log('[MdocService] status:', response.status, '| body:', responseText.substring(0, 300));

  if (!response.ok) {
    if (response.status === 424) {
      throw Object.assign(new Error('CREDENTIAL_NOT_AVAILABLE_424'), { statusCode: 424 });
    }
    throw new Error(`Mdoc credential request failed: ${response.status} - ${responseText}`);
  }

  const parsed = JSON.parse(responseText);
  const rawCbor: string = parsed.credential;
  if (!rawCbor || typeof rawCbor !== 'string') {
    throw new Error('Mdoc response missing "credential" field');
  }

  const mdoc = {
    id: generateId(),
    format: 'mso_mdoc' as const,
    doctype,
    rawCbor,
    issuer: issuer.credential_issuer ?? issuer.issuerUrl ?? issuer.id,
    issuedAt: new Date().toISOString(),
    metadata: {
      addedDate: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      isPinned: false,
      tags: [],
      issuerInfo: issuer,
      credentialType,
      originalResponse: parsed,
    },
  };

  // Salva no storage criptografado do SDK
  const sdk = VCSDK as any;
  await sdk.services?.storage?.storeMdocCredential?.(mdoc);

  console.log('[MdocService] ✅ mdoc salvo | doctype:', doctype, '| cbor length:', rawCbor.length);
  return mdoc;
}
