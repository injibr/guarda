import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useWallet } from '../../hooks/useWallet';
import { getAuthDataFromStorage } from '../../components/CustomAuthWebView/authStorage';
import StackedCards from '../../components/StackedCards';
import EmptyState from '../../components/EmptyState';
import { Footer, QRButton, QRButtonText } from './styles';

interface HomeProps {
  sdkReady?: boolean;
  onNavigateAdd: () => void;
  onNavigateDocument: (credential: any) => void;
  onNavigateSplash: () => void;
  onNavigateConsent: () => void;
  onNavigateQrScanner: () => void;
}

export default function Home({ sdkReady, onNavigateAdd, onNavigateDocument, onNavigateQrScanner }: HomeProps) {
  const { credentials } = useWallet(sdkReady ?? false);

  useEffect(() => {
    getAuthDataFromStorage();
  }, []);

  return (
    <>
      <View style={{ flex: 1 }}>
        {credentials.length === 0
            ? <EmptyState onNavigateAdd={onNavigateAdd} />
            : <StackedCards credentials={credentials} onNavigateDocument={onNavigateDocument} />
        }
      </View>

      <Footer>
        <QRButton onPress={onNavigateQrScanner}>
          <Ionicons name="qr-code-outline" size={24} color="#FFF" />
          <QRButtonText>Ler QR-Code</QRButtonText>
        </QRButton>
      </Footer>
    </>
  );
}
