import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return;

      // Verifica atualização apenas ao abrir/recarregar a plataforma
      registration.update().catch(() => {
        // Silently ignore (pode estar offline)
      });
    },
    onRegisterError(error) {
      console.error("[PWA] Erro ao registrar service worker:", error);
    },
  });

  // Quando detecta nova versão, atualiza automaticamente
  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);
}
