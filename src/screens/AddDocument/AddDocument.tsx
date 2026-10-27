import React, { useState } from 'react';
import { FlatList, ActivityIndicator, TouchableOpacity, Text, View, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIssuers } from '../../hooks/useIssuers';
import { useWallet } from '../../hooks/useWallet';
import { useAuthStore } from '../../store/authStore';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import NoCredentialModal from '../../components/NoCredentialModal';
import {
  Container,
  Header,
  BackButton,
  HeaderTitle,
  Spacer,
  Card,
  CardLeft,
  CardIconContainer,
  CardTitle,
  CardAction,
} from './styles';

interface AddDocumentProps {
  sdkReady?: boolean;
  onBack: () => void;
  onLoginRequired?: () => void;
}

interface DocumentItem {
  id: string;
  title: string;
  issuer: any;
  type: any;
}

export default function AddDocument({ sdkReady, onBack, onLoginRequired }: AddDocumentProps) {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showNoCredentialModal, setShowNoCredentialModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { sections, loading, reload } = useIssuers(sdkReady ?? false);
  const { downloadCredential, downloadingId } = useWallet(sdkReady ?? false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const [pendingDownload, setPendingDownload] = useState<{ issuer: any; type: any } | null>(null);
  const [idMatricula, setIdMatricula] = useState('');

  const doDownload = async (issuer: any, type: any, credentialSubject: Record<string, string>) => {
    try {
      await downloadCredential(issuer, { ...type, credentialSubject });
      setShowSuccessModal(true);
    } catch (e: any) {
      if (e?.code === 'AUTH_REQUIRED') {
        setShowNoCredentialModal(true);
        return;
      }
      showError('Falha ao baixar credencial. Tente novamente.');
    }
  };

  const handleDownload = async (issuer: any, type: any) => {
    if (!isAuthenticated) return setShowNoCredentialModal(true);
    if (type.id === 'SGQPCursoCredential') {
      setIdMatricula('');
      setPendingDownload({ issuer, type });
      return;
    }
    await doDownload(issuer, type, {});
  };

  const handleConfirmMatricula = async () => {
    if (!pendingDownload) return;
    const { issuer, type } = pendingDownload;
    setPendingDownload(null);
    await doDownload(issuer, type, { idMatricula: idMatricula.trim() });
  };

  const renderItem = ({ item }: { item: DocumentItem }) => {
    const isDownloading = downloadingId === item.id;
    return (
      <Card
        available
        cardColor="#3B82F6"
        disabled={downloadingId !== null}
        activeOpacity={0.7}
        onPress={() => handleDownload(item.issuer, item.type)}
      >
        <CardLeft>
          <CardIconContainer>
            <Ionicons name="shield-checkmark" size={24} color="#FFF" />
          </CardIconContainer>
          <CardTitle numberOfLines={2}>{item.title}</CardTitle>
        </CardLeft>
        {isDownloading
          ? <ActivityIndicator color="#FFF" size="small" />
          : <CardAction>Adicionar</CardAction>
        }
      </Card>
    );
  };

  const renderSectionHeader = (title: string) => (
    <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8, marginTop: 4 }}>
      {title.toUpperCase()}
    </Text>
  );

  return (
    <Container>
      <Header>
        <BackButton onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </BackButton>
        <HeaderTitle>Adicionar Documento</HeaderTitle>
        <Spacer />
      </Header>

      <FlatList
        data={sections}
        keyExtractor={(section) => section.issuer.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: section }) => (
          <View>
            {sections.length > 1 && renderSectionHeader(section.title)}
            {section.data.map((type: any, i: number) =>
              renderItem({ item: {
                id: `${section.issuer.id}-${type.id}`,
                title: type.name || type.id,
                issuer: section.issuer,
                type,
              }})
            )}
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <TouchableOpacity onPress={reload} style={{ alignItems: 'center', marginTop: 40, padding: 16 }}>
              <Text style={{ color: '#3B82F6', fontSize: 15 }}>Nenhum documento disponível. Toque para tentar novamente.</Text>
            </TouchableOpacity>
          ) : null
        }
        ListHeaderComponent={
          loading ? <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} /> : null
        }
      />

      <NoCredentialModal
        visible={showNoCredentialModal}
        onContinue={() => { setShowNoCredentialModal(false); onLoginRequired?.(); }}
        onDismiss={() => setShowNoCredentialModal(false)}
      />

      <Modal visible={!!pendingDownload} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, width: '100%' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Certificado de Qualificação Profissional</Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Informe o número da matrícula do curso.</Text>
            <TextInput
              value={idMatricula}
              onChangeText={setIdMatricula}
              placeholder="Número da matrícula"
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16 }}
            />
            <TouchableOpacity
              onPress={handleConfirmMatricula}
              disabled={!idMatricula.trim()}
              style={{ backgroundColor: idMatricula.trim() ? '#3B82F6' : '#9CA3AF', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 8 }}
            >
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingDownload(null)} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={{ color: '#6B7280' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SuccessModal
        visible={showSuccessModal}
        title="Credencial Baixada!"
        description="Sua credencial foi baixada com sucesso e já está disponível na sua carteira."
        buttonText="Ver Credencial"
        onClose={() => { setShowSuccessModal(false); onBack(); }}
      />

      <ErrorModal
        visible={showErrorModal}
        title="Erro ao Baixar"
        description={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </Container>
  );
}
