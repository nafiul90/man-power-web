import { useState, useCallback } from 'react';

export function useNotification() {
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const notify = useCallback((type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  return { notification, notify };
}
