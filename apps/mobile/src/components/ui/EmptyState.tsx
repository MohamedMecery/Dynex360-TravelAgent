import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/useTheme";

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 32, alignItems: "center", gap: 8 },
  title: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  message: { fontSize: 14, textAlign: "center" },
  btn: { marginTop: 12, alignSelf: "stretch" },
});
