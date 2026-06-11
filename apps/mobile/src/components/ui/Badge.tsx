import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Tone = "default" | "success" | "warning" | "destructive";

interface BadgeProps {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = "default" }: BadgeProps) {
  const { colors } = useTheme();
  const bg =
    tone === "success"
      ? colors.success + "22"
      : tone === "warning"
        ? colors.warning + "22"
        : tone === "destructive"
          ? colors.destructiveMuted
          : colors.surfaceMuted;
  const fg =
    tone === "success"
      ? colors.success
      : tone === "warning"
        ? colors.warning
        : tone === "destructive"
          ? colors.destructive
          : colors.textMuted;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  text: { fontSize: 12, fontWeight: "600" },
});
