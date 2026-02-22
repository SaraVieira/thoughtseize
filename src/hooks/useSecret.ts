import { useState, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useSecret() {
  const [content, setContent] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(async (relativePath: string) => {
    setDecrypting(true);
    setError(null);
    setContent(null);
    try {
      const text = await invoke<string>("decrypt_secret", {
        relativePath,
      });
      setContent(text);
    } catch (e) {
      setError(String(e));
    } finally {
      setDecrypting(false);
    }
  }, []);

  const save = useCallback(
    async (relativePath: string, newContent: string) => {
      setSaving(true);
      setError(null);
      try {
        await invoke("save_secret", {
          relativePath,
          content: newContent,
        });
        setContent(newContent);
      } catch (e) {
        setError(String(e));
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setContent(null);
    setError(null);
  }, []);

  return useMemo(
    () => ({ content, decrypting, saving, error, decrypt, save, clear }),
    [content, decrypting, saving, error, decrypt, save, clear],
  );
}
