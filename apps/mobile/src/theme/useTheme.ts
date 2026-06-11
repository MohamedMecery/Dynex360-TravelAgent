import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "@/theme/colors";

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return { colors: isDark ? darkColors : lightColors, isDark };
}
