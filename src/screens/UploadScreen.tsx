import React from 'react';
import { View, StyleSheet } from 'react-native';
import UploadView from '../components/UploadView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Upload'>;

export default function UploadScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <UploadView language="en" onUploadComplete={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
