import * as SecureStore from "expo-secure-store";

const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number): string {
  return `${key}_chunk_${index}`;
}

export const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!countRaw) {
      return SecureStore.getItemAsync(key);
    }
    const count = Number(countRaw);
    if (!Number.isFinite(count) || count <= 0) {
      return null;
    }
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part == null) {
        return null;
      }
      parts.push(part);
    }
    return parts.join("");
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
    const oldCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (oldCountRaw) {
      const oldCount = Number(oldCountRaw);
      for (let i = 0; i < oldCount; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
    }

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(`${key}_chunks`);
      return;
    }

    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < chunks; i++) {
      await SecureStore.setItemAsync(
        chunkKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunks));
    await SecureStore.deleteItemAsync(key);
  },
  removeItem: async (key: string): Promise<void> => {
    const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (countRaw) {
      const count = Number(countRaw);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};
