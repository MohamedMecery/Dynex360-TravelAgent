import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

export function Skeleton({
  height = 16,
  width = "100%",
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.block,
        { height, width: width as ViewStyle["width"], backgroundColor: colors.skeleton },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({ block: { borderRadius: 8 } });
