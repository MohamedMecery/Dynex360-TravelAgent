import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

interface AvatarProps {
  name?: string | null;
  size?: number;
}

export function Avatar({ name, size = 36 }: AvatarProps) {
  const { colors } = useTheme();
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary + "33",
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.primary, fontSize: size * 0.35 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "700" },
});
