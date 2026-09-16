import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

export const PENDING_KEY = 'pending_deep_link';

interface PresentationDefinition {
  id: string;
  input_descriptors: any[];
}

export interface RequestedField {
  id: string;
  name: string;
  type: string;
}

interface DeepLinkParams {
  origin?: string;
  requestId?: string;
  state?: string;
  nonce?: string;
  client_id?: string;
  request_uri?: string;
  response_uri?: string;
  presentation_definition?: string;
}

interface PendingDeepLink {
  appName: string;
  shareUrl: string;
  origin: string;
  requestId: string;
  requestedFields: RequestedField[];
}

const DEFAULT_PRESENTATION_DEFINITION: PresentationDefinition = {
  id: 'eca-age-check',
  input_descriptors: [{
    id: 'ECACredential',
    name: 'Comprovante de Maioridade',
    purpose: 'Verificar que o usuário é maior de 18 anos',
    constraints: { fields: [{ path: ['$.type'], filter: { type: 'string', pattern: 'ECACredential' } }] },
  }],
};

function buildShareUrl(requestId: string, nonce: string, presentationDefinition: PresentationDefinition, responseUri?: string, clientId?: string): string {
  const params = new URLSearchParams({
    response_type: 'vp_token',
    response_mode: 'direct_post',
    client_id: clientId ?? '',
    redirect_uri: String(responseUri),
    presentation_definition: JSON.stringify(presentationDefinition),
    nonce,
    state: requestId,
  });
  return `openid4vp://?${params.toString()}`;
}

async function resolveShareUrlFromRequestUri(requestUri: string): Promise<{ url: string; pd: PresentationDefinition }> {
  const res = await fetch(requestUri);
  const jwt = await res.text();
  const payload = jwtDecode<any>(jwt);

  const pd: PresentationDefinition = payload.presentation_definition ?? DEFAULT_PRESENTATION_DEFINITION;
  const redirectUri = payload.response_uri ?? payload.redirect_uri;
  const params = new URLSearchParams({
    response_type: 'vp_token',
    response_mode: 'direct_post',
    client_id: payload.client_id ?? '',
    redirect_uri: redirectUri,
    presentation_definition: JSON.stringify(pd),
    nonce: payload.nonce ?? '',
    state: payload.state ?? '',
  });
  return { url: `openid4vp://?${params.toString()}`, pd };
}

function extractAppName(origin: string): string {
  return origin.split('://')[0] || 'Aplicativo';
}

function parseDeepLinkParams(url: string): DeepLinkParams {
  return Object.fromEntries(new URL(url).searchParams.entries()) as DeepLinkParams;
}

function resolvePresentationDefinition(raw?: string): PresentationDefinition {
  return raw ? JSON.parse(raw) : DEFAULT_PRESENTATION_DEFINITION;
}

async function resolveShareUrl(params: DeepLinkParams): Promise<{ url: string; pd: PresentationDefinition }> {
  if (params.request_uri)
    return resolveShareUrlFromRequestUri(params.request_uri);

  const pd = resolvePresentationDefinition(params.presentation_definition);
  return {
    url: buildShareUrl(
      params.requestId ?? params.state ?? '',
      params.nonce ?? '',
      pd,
      params.response_uri,
      params.client_id,
    ),
    pd,
  };
}

function extractRequestedFields(pd: PresentationDefinition): RequestedField[] {
  return pd.input_descriptors.map((d) => ({
    id: d.id,
    name: d.name || d.id,
    type: d.constraints?.fields
      ?.find((f: any) => f.path?.includes('$.type'))
      ?.filter?.pattern ?? d.id,
  }));
}

export async function resolveOpenId4VpUrl(url: string): Promise<{ url: string; pd: PresentationDefinition }> {
  const [, query] = url.split('?');
  const params = Object.fromEntries(new URLSearchParams(query || '').entries()) as DeepLinkParams;
  return resolveShareUrl(params);
}

export async function handleDeepLink(url: string): Promise<{ appName: string; requestedFields: RequestedField[] }> {
  const params = parseDeepLinkParams(url);
  const origin = params.origin ?? '';
  const appName = extractAppName(origin);
  const { url: shareUrl, pd } = await resolveShareUrl(params);
  const requestedFields = extractRequestedFields(pd);

  const pending: PendingDeepLink = { appName, shareUrl, origin, requestId: params.requestId ?? params.state ?? '', requestedFields };
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  return { appName, requestedFields };
}
