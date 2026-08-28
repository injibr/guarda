import { useEffect, useState } from 'react';
import { VCSDK } from '@br.gov.dataprev.inji/wallet-sdk';
import { useAuthStore } from '../store/authStore';

export interface WalletCredential {
  id: string;
  title: string;
  feedbackText: string;
  isWarn: boolean;
  vc: any;
}

function isMdoc(vc: any): boolean {
  return vc.type?.includes('mso_mdoc') || vc.metadata?.credentialType?.format === 'mso_mdoc';
}

function resolveAgeFeedback(subject: any): string {
  if (subject?.isOver18 === true)  return 'Maior de 18 anos';
  if (subject?.isOver18 === false) return 'Menor de 18 anos';
  return '';
}

export function useWallet(enabled: boolean = true) {
  const [credentials, setCredentials] = useState<WalletCredential[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const accessToken = useAuthStore((state) => state.accessToken);

  const loadCredentials = async (): Promise<void> => {
    try {
      const list: any[] = await VCSDK.credentials.getAll();
      const byType: Record<string, any> = {};

      for (const vc of list) {
        const type = isMdoc(vc)
          ? (vc.type?.find((t: string) => t !== 'mso_mdoc') || 'mso_mdoc')
          : (vc.type?.find((t: string) => t !== 'VerifiableCredential') || 'Credencial');
        const existing = byType[type];
        if (!existing || new Date(vc.metadata?.addedDate) > new Date(existing.metadata?.addedDate)) {
          byType[type] = vc;
        }
      }

      setCredentials(
        Object.values(byType).map((vc: any, i: number) => ({
          id: vc.id || String(i),
          title: vc.metadata?.credentialType?.name || vc.type?.[1] || 'Credencial',
          feedbackText: isMdoc(vc)
            ? 'Documento Digital (mDoc)'
            : (resolveAgeFeedback(vc.credentialSubject) || vc.metadata?.issuerInfo?.name || vc.issuer || ''),
          isWarn: !isMdoc(vc) && vc.credentialSubject?.isOver18 === false,
          vc,
        }))
      );
    } catch (e) {
      console.error('[Wallet] Load credentials failed', e);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    setReady(true);
    loadCredentials().catch(() => {});
  }, [enabled]);

  const downloadCredential = async (issuer: any, type: any): Promise<void> => {
    const id = `${issuer?.id}-${type?.id}`;
    setDownloadingId(id);
    try {
      if (!accessToken) throw Object.assign(new Error('[Wallet] Auth required'), { code: 'AUTH_REQUIRED' });
      const result = await VCSDK.credentials.download(issuer, type, accessToken);
      if (result === null) throw Object.assign(new Error('[Wallet] Auth required'), { code: 'AUTH_REQUIRED' });
      await loadCredentials();
    } catch (e) {
      throw e;
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteCredential = async (vcId: string): Promise<void> => {
    await VCSDK.credentials.delete(vcId);
    await loadCredentials();
  };

  return { credentials, downloadingId, ready, downloadCredential, loadCredentials, deleteCredential };
}
