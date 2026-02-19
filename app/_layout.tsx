import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NetworkProvider } from '../context/NetworkContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

function RootLayoutInner() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Gestion de Cours',
          }}
        />
        <Stack.Screen
          name="bucket/[name]"
          options={{
            title: 'Fichiers',
          }}
        />
        <Stack.Screen
          name="viewer"
          options={{
            title: 'Aperçu',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Paramètres',
          }}
        />
        <Stack.Screen
          name="downloads"
          options={{
            title: 'Téléchargements',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <RootLayoutInner />
      </NetworkProvider>
    </ThemeProvider>
  );
}
