import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FieldsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fields</Text>
      <Text style={styles.subtitle}>Your fields will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a5632',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
