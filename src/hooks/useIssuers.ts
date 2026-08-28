import { useEffect, useState } from 'react';
import { VCSDK } from '@br.gov.dataprev.inji/wallet-sdk';

interface CredentialType {
  id: string;
  name?: string;
}

interface Issuer {
  id: string;
  name?: string;
}

export interface IssuerSection {
  title: string;
  issuer: Issuer;
  data: CredentialType[];
}

const TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

async function fetchIssuers(): Promise<IssuerSection[]> {
  try {
    const list: Issuer[] = await withTimeout(VCSDK.issuers.getAll(), TIMEOUT_MS);

    const results = await Promise.all(
      list.map(async (issuer) => {
        try {
          const types: CredentialType[] = await withTimeout(
            VCSDK.issuers.getCredentialTypes(issuer.id),
            TIMEOUT_MS,
          );
          return types.length > 0
            ? { title: issuer.name || issuer.id, issuer, data: types }
            : null;
        } catch {
          return null;
        }
      }),
    );

    return results.filter((r): r is IssuerSection => r !== null);
  } catch {
    return [];
  }
}

export function useIssuers(enabled: boolean) {
  const [sections, setSections] = useState<IssuerSection[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchIssuers()
      .then(setSections)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled]);

  return { sections, loading, reload: load };
}
