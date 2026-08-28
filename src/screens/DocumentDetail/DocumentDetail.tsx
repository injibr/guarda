import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DeleteCredentialModal from '../../components/DeleteCredentialModal';
import {
  Container,
  Header,
  BackButton,
  HeaderTitle,
  Spacer,
  ScrollContent,
  AgeCard,
  AgeIconContainer,
  AgeTitle,
  StatusBadge,
  StatusDot,
  StatusText,
  WarningBadge,
  WarningText,
  SectionTitle,
  InfoCard,
  InfoRow,
  InfoLabel,
  InfoValue,
  DeleteButton,
  DeleteButtonText,
} from './styles';

interface DocumentDetailProps {
  onBack: () => void;
  credential: any;
  onDelete: (vcId: string) => Promise<void>;
}

interface AgeInfo {
  label: string;
  isMinor: boolean;
  icon: string;
}

const ISSUER_NAMES: Record<string, string> = {
  mgi: 'Ministério da Gestão e Inovação',
  mda: 'Ministério do Desenvolvimento Agrário',
  dataprev: 'Dataprev',
};

function resolveIssuerName(vc: any): string {
  const issuerId = vc?.metadata?.issuerId || vc?.metadata?.issuerInfo?.issuerId || '';
  if (issuerId) {
    const key = issuerId.toLowerCase();
    if (ISSUER_NAMES[key]) return ISSUER_NAMES[key];
  }
  const issuer = vc?.issuer || '';
  for (const [key, name] of Object.entries(ISSUER_NAMES)) {
    if (issuer.toLowerCase().includes(key)) return name;
  }
  return issuer || 'Emissor desconhecido';
}

function resolveCredentialType(vc: any): string {
  const types: string[] = vc?.type || [];
  if (types.includes('mso_mdoc') || vc?.metadata?.credentialType?.format === 'mso_mdoc') return 'mDoc';
  if (types.includes('CAFCredential')) return 'CAF';
  if (types.includes('CARReceipt')) return 'CAR';
  if (types.includes('CCIRCredential')) return 'CCIR';
  if (types.includes('ECACredential') || types.includes('AgeVerificationCredential')) return 'Maioridade';
  return types.find((t: string) => t !== 'VerifiableCredential') || 'Credencial';
}

function resolveAgeInfo(subject: any): AgeInfo {
  if (subject?.isOver18 === true)  return { label: 'Maior de 18 anos', isMinor: false, icon: 'checkmark-circle' };
  if (subject?.isOver18 === false) return { label: 'Menor de 18 anos', isMinor: true,  icon: 'alert-circle' };
  return { label: 'Não informado', isMinor: false, icon: 'help-circle' };
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function AgeSection({ subject }: { subject: any }) {
  const ageInfo = resolveAgeInfo(subject);
  return (
    <AgeCard isMinor={ageInfo.isMinor}>
      <AgeIconContainer>
        <Ionicons name={ageInfo.icon as any} size={64} color={ageInfo.isMinor ? '#F59E0B' : '#10B981'} />
      </AgeIconContainer>
      <AgeTitle>{ageInfo.label}</AgeTitle>
      {ageInfo.isMinor ? (
        <WarningBadge>
          <Ionicons name="alert-circle" size={16} color="#92400E" />
          <WarningText>Menor de Idade</WarningText>
        </WarningBadge>
      ) : (
        <StatusBadge>
          <StatusDot />
          <StatusText>Credencial Ativa</StatusText>
        </StatusBadge>
      )}
    </AgeCard>
  );
}

function isPlaceholder(value: any): boolean {
  if (!value || typeof value !== 'string') return true;
  return value.includes('${');
}

function CARSection({ subject }: { subject: any }) {
  return (
    <>
      <SectionTitle>Dados do Imóvel</SectionTitle>
      <InfoCard>
        {!isPlaceholder(subject.nomeImovel) && <InfoRow><InfoLabel>Nome</InfoLabel><InfoValue>{subject.nomeImovel}</InfoValue></InfoRow>}
        {!isPlaceholder(subject.municipio) && <InfoRow bordered><InfoLabel>Município</InfoLabel><InfoValue>{subject.municipio}{!isPlaceholder(subject.unidadefederativa) ? ` - ${subject.unidadefederativa}` : ''}</InfoValue></InfoRow>}
        {!isPlaceholder(subject.protocolo) && <InfoRow bordered><InfoLabel>Protocolo</InfoLabel><InfoValue>{subject.protocolo}</InfoValue></InfoRow>}
        {!isPlaceholder(subject.areaTotalImovel) && <InfoRow bordered><InfoLabel>Área Total</InfoLabel><InfoValue>{subject.areaTotalImovel} ha</InfoValue></InfoRow>}
        {!isPlaceholder(subject.nomeProprietario) && <InfoRow><InfoLabel>Proprietário</InfoLabel><InfoValue>{subject.nomeProprietario}</InfoValue></InfoRow>}
      </InfoCard>
    </>
  );
}

function CCIRSection({ subject }: { subject: any }) {
  return (
    <>
      <SectionTitle>Dados do Imóvel</SectionTitle>
      <InfoCard>
        {!isPlaceholder(subject.nomeImovel || subject.denominacao) && <InfoRow><InfoLabel>Nome</InfoLabel><InfoValue>{subject.nomeImovel || subject.denominacao}</InfoValue></InfoRow>}
        {!isPlaceholder(subject.codigoImovel || subject.numeroCCIR) && <InfoRow bordered><InfoLabel>Código</InfoLabel><InfoValue>{subject.codigoImovel || subject.numeroCCIR}</InfoValue></InfoRow>}
        {!isPlaceholder(subject.municipio) && <InfoRow bordered><InfoLabel>Município</InfoLabel><InfoValue>{subject.municipio}{!isPlaceholder(subject.unidadefederativa || subject.unidadeFederativa) ? ` - ${subject.unidadefederativa || subject.unidadeFederativa}` : ''}</InfoValue></InfoRow>}
        {!isPlaceholder(subject.areaTotalImovel) && <InfoRow bordered><InfoLabel>Área Total</InfoLabel><InfoValue>{subject.areaTotalImovel} ha</InfoValue></InfoRow>}
        {!isPlaceholder(subject.situacaoImovel) && <InfoRow bordered><InfoLabel>Situação</InfoLabel><InfoValue>{subject.situacaoImovel}</InfoValue></InfoRow>}
        {!isPlaceholder(subject.nomeProprietario) && <InfoRow><InfoLabel>Proprietário</InfoLabel><InfoValue>{subject.nomeProprietario}</InfoValue></InfoRow>}
      </InfoCard>
    </>
  );
}

function MdocSection({ vc }: { vc: any }) {
  const doctype = vc?.metadata?.credentialType?.doctype
    || vc?.metadata?.credentialType?.fullConfig?.doctype
    || vc?.type?.find((t: string) => t !== 'mso_mdoc')
    || 'br.gov.mgi.eca';
  return (
    <>
      <SectionTitle>Documento Digital (mDoc)</SectionTitle>
      <InfoCard>
        <InfoRow><InfoLabel>Formato</InfoLabel><InfoValue>ISO 18013 mDoc</InfoValue></InfoRow>
        <InfoRow bordered><InfoLabel>Doctype</InfoLabel><InfoValue>{doctype}</InfoValue></InfoRow>
        <InfoRow bordered><InfoLabel>Armazenamento</InfoLabel><InfoValue>CBOR base64url</InfoValue></InfoRow>
      </InfoCard>
    </>
  );
}

function CAFSection({ subject }: { subject: any }) {
  return (
    <>
      <SectionTitle>Informações do CAF</SectionTitle>
      <InfoCard>
        {subject.situacao        && <InfoRow><InfoLabel>Situação</InfoLabel><InfoValue>{subject.situacao}</InfoValue></InfoRow>}
        {subject.municipioUF     && <InfoRow bordered><InfoLabel>Município/UF</InfoLabel><InfoValue>{subject.municipioUF}</InfoValue></InfoRow>}
        {subject.atividadePrincipal && <InfoRow bordered><InfoLabel>Atividade Principal</InfoLabel><InfoValue>{subject.atividadePrincipal}</InfoValue></InfoRow>}
        {subject.enquadramentoPronaf && <InfoRow bordered><InfoLabel>Enquadramento PRONAF</InfoLabel><InfoValue>{subject.enquadramentoPronaf}</InfoValue></InfoRow>}
        {subject.caracterizacaoArea && <InfoRow><InfoLabel>Caracterização da Área</InfoLabel><InfoValue>{subject.caracterizacaoArea}</InfoValue></InfoRow>}
      </InfoCard>

      {subject.membros?.length > 0 && (
        <>
          <SectionTitle>Membros da Família</SectionTitle>
          <InfoCard>
            {subject.membros.map((membro: any, index: number) => (
              <InfoRow key={index} bordered={index !== subject.membros.length - 1}>
                <InfoValue>{membro.nome || `Membro ${index + 1}`}</InfoValue>
                {membro.parentesco && <InfoLabel>{membro.parentesco}</InfoLabel>}
              </InfoRow>
            ))}
          </InfoCard>
        </>
      )}

      {subject.razaoSocial && (
        <>
          <SectionTitle>Entidade Emissora</SectionTitle>
          <InfoCard>
            <InfoRow><InfoLabel>Razão Social</InfoLabel><InfoValue>{subject.razaoSocial}</InfoValue></InfoRow>
            {subject.cnpj && <InfoRow bordered><InfoLabel>CNPJ</InfoLabel><InfoValue>{subject.cnpj}</InfoValue></InfoRow>}
          </InfoCard>
        </>
      )}
    </>
  );
}

export default function DocumentDetail({ onBack, credential, onDelete }: DocumentDetailProps) {
  const vc = credential?.vc || {};
  const subject = vc.credentialSubject || {};
  const credType = resolveCredentialType(vc);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = async () => {
    try {
      await onDelete(credential?.vc?.id ?? credential?.id);
      setShowDeleteModal(false);
      onBack();
    } catch {
      // silently ignore delete errors
    }
  };

  return (
    <Container>
      <Header>
        <BackButton onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </BackButton>
        <HeaderTitle>Detalhes</HeaderTitle>
        <Spacer />
      </Header>

      <ScrollContent>
        {credType === 'mDoc' && <MdocSection vc={vc} />}
        {credType === 'Maioridade' && <AgeSection subject={subject} />}

        <SectionTitle>Informações da Credencial</SectionTitle>
        <InfoCard>
          <InfoRow><InfoLabel>Tipo</InfoLabel><InfoValue>{credType}</InfoValue></InfoRow>
          <InfoRow bordered><InfoLabel>Emissor</InfoLabel><InfoValue>{resolveIssuerName(vc)}</InfoValue></InfoRow>
          <InfoRow bordered><InfoLabel>Data de Emissão</InfoLabel><InfoValue>{formatDate(vc.issuanceDate)}</InfoValue></InfoRow>
          <InfoRow><InfoLabel>Validade</InfoLabel><InfoValue>{formatDate(vc.expirationDate) || 'Indeterminada'}</InfoValue></InfoRow>
        </InfoCard>

        {credType === 'CAR' && <CARSection subject={subject} />}
        {credType === 'CCIR' && <CCIRSection subject={subject} />}
        {credType === 'CAF' && <CAFSection subject={subject} />}

        <DeleteButton onPress={() => setShowDeleteModal(true)}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <DeleteButtonText>Apagar Credencial</DeleteButtonText>
        </DeleteButton>
      </ScrollContent>

      <DeleteCredentialModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </Container>
  );
}
