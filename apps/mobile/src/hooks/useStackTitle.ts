import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";

export function useStackTitle(title: string): void {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);
}
