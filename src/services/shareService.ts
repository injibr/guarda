import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VCSDK } from '@br.gov.dataprev.inji/wallet-sdk';
import { PENDING_KEY } from './deepLinkHandler';

interface ResolvedCredential {
  inputDescriptorId: string;
  credentialTypeId: string;
  type: string;
  name: string;
  system: string;
  issuerId: string;
}

interface PendingShare {
  shareUrl: string;
  origin?: string;
  requestId?: string;
}

function extractTypeFromDescriptor(descriptor: any): string {
  return (
    descriptor.constraints?.fields
      ?.find((f: any) => f.path?.includes('$.type'))
      ?.filter?.pattern ?? descriptor.id
  );
}

// Caso adicionar novas credenciais, deve alterar aqui, para ficar dinâmico
function resolveCredentials(requestedCredentials: ResolvedCredential[], authRequest: any): ResolvedCredential[] {
  if (requestedCredentials.length > 0) return requestedCredentials;

  const descriptors: any[] = authRequest.presentation_definition?.input_descriptors ?? [];
  return descriptors.map((d) => ({
    inputDescriptorId: d.id,
    credentialTypeId: d.id,
    type: extractTypeFromDescriptor(d),
    name: d.name || d.id,
    system: 'MGI',
    issuerId: 'MGI',
  }));
}

function isCredentialValid(vc: any, type: string): boolean {
  const types: string[] = Array.isArray(vc.type) ? vc.type : [vc.type];
  const typeMatches = types.some((t) => t === type || t?.includes(type) || type?.includes(t));
  if (!typeMatches) return false;
  if (!vc.expirationDate) return true;
  return new Date(vc.expirationDate) > new Date();
}

async function downloadMissingCredentials(credentials: ResolvedCredential[]): Promise<void> {
  // Always delete existing credentials and download fresh ones
  // The server rejects stale VCs, so we always need a fresh VC
  const existing = await VCSDK.credentials.getAll();
  for (const vc of existing) {
    await VCSDK.credentials.delete(vc.id);
  }

  const { successCount, error424Count, realErrorCount } =
    await VCSDK.share.downloadCredentials(credentials);

  if (successCount === 0)
    throw new Error(`Download falhou. 424s: ${error424Count}, erros: ${realErrorCount}`);
}

async function sendPresentation(authRequest: any, credentials: ResolvedCredential[], pending: PendingShare): Promise<void> {
  const result = await VCSDK.share.completeShare(authRequest, credentials);
  await AsyncStorage.removeItem(PENDING_KEY);

  if (result.success && pending.origin) {
    try {
      await Linking.openURL(pending.origin);
    } catch {}
  }
}

export async function executeShare(pending: PendingShare): Promise<void> {
  const { requestedCredentials, authRequest } = await VCSDK.share.parseRequest(pending.shareUrl);
  const credentials = resolveCredentials(requestedCredentials, authRequest);

  await downloadMissingCredentials(credentials);
  await sendPresentation(authRequest, credentials, pending);
}

export async function declineShare(origin?: string): Promise<void> {
  VCSDK.share.declineShare();
  await AsyncStorage.removeItem(PENDING_KEY);
  if (origin) await Linking.openURL(`${origin}?verified=false`);
}
