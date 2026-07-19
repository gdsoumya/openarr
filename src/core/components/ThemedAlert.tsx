import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertContextType {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType>({ alert: () => {} });

export function useThemedAlert() {
  return useContext(AlertContext);
}

export function ThemedAlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState>({ visible: false, title: '', buttons: [] });

  const alert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setState({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: 'OK' }],
    });
  }, []);

  const dismiss = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  const handleButton = useCallback((button: AlertButton) => {
    dismiss();
    // Small delay so modal closes before action runs
    if (button.onPress) {
      setTimeout(button.onPress, 200);
    }
  }, [dismiss]);

  const cancelButton = state.buttons.find(b => b.style === 'cancel');
  const actionButtons = state.buttons.filter(b => b.style !== 'cancel');

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}
      <Modal visible={state.visible} transparent animationType="fade" onRequestClose={() => {
        if (cancelButton) handleButton(cancelButton);
        else dismiss();
      }}>
        <Pressable style={styles.overlay} onPress={() => {
          if (cancelButton) handleButton(cancelButton);
          else dismiss();
        }}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
            <LinearGradient colors={['#1c2148', '#131634']} style={StyleSheet.absoluteFill} />
            <Text style={styles.title}>{state.title}</Text>
            {state.message && <Text style={styles.message}>{state.message}</Text>}

            <View style={styles.buttons}>
              {actionButtons.map((btn, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.button,
                    btn.style === 'destructive' ? styles.buttonDestructive : styles.buttonDefault,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleButton(btn)}
                >
                  <Text style={[
                    styles.buttonText,
                    btn.style === 'destructive' && styles.buttonTextDestructive,
                  ]}>
                    {btn.text}
                  </Text>
                </Pressable>
              ))}
              {cancelButton && (
                <Pressable
                  style={({ pressed }) => [styles.button, styles.buttonCancel, pressed && styles.buttonPressed]}
                  onPress={() => handleButton(cancelButton)}
                >
                  <Text style={styles.buttonTextCancel}>{cancelButton.text}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  dialog: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  buttons: {
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  buttonDefault: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  buttonDestructive: {
    backgroundColor: 'rgba(233,69,96,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.3)',
  },
  buttonCancel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  buttonTextDestructive: {
    color: colors.error,
  },
  buttonTextCancel: {
    ...typography.bodyBold,
    color: colors.textMuted,
  },
});
