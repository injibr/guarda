import React, { useState } from 'react';
import { FlatList, ActivityIndicator, TouchableOpacity, Text, View } from 'react-native';
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

  const handleDownload = async (issuer: any, type: any) => {
    if (!isAuthenticated) return setShowNoCredentialModal(true);
    try {
      await downloadCredential(issuer, type);
      setShowSuccessModal(true);
    } catch (e: any) {
      if (e?.code === 'AUTH_REQUIRED') {
        setShowNoCredentialModal(true);
        return;
      }
      showError('Falha ao baixar credencial. Tente novamente.');
    }
  };

  const renderItem = ({ item }: { item: DocumentItem }) => {
    const itemId = `${item.issuer?.id}-${item.type?.id}`;
    const isDownloading = downloadingId === itemId;
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
                id: `${section.issuer.id}-${i}`,
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
