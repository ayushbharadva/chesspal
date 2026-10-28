import AsyncStorage from '@react-native-async-storage/async-storage';
import { type StateStorage } from 'zustand/middleware';

import { decodeProgress } from '@/storage/schema';

export const PROGRESS_KEY = 'rookiereps-progress';
let writeQueue = Promise.resolve();
let onStorageIssue: () => void = () => undefined;
export function flushProgressWrites() {
  return writeQueue;
}

export function reportStorageIssues(callback: () => void) {
  onStorageIssue = callback;
}

export const progressStorage: StateStorage = {
  async getItem(key) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      try {
        const decoded = decodeProgress(raw);
        return JSON.parse(raw).state.lessonProgress !== undefined ? raw : JSON.stringify(decoded);
      } catch {
        await AsyncStorage.setItem(`${key}-backup`, raw);
        onStorageIssue();
        return null;
      }
    } catch {
      onStorageIssue();
      return null;
    }
  },
  setItem(key, value) {
    writeQueue = writeQueue
      .then(() => AsyncStorage.setItem(key, value))
      .catch(() => {
        onStorageIssue();
      });
    return writeQueue;
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(key);
  },
};
