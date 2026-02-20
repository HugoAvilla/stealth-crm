import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return;

      // Verifica atualizações imediatamente ao registrar
      registration.update();

      // Verifica atualizações a cada 60 segundos
      setInterval(() => {
        registration.update();
      }, 60 * 1000);
    },
    onRegisterError(error) {
      console.error("[PWA] Erro ao registrar service worker:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // Nova versão disponível — atualiza e recarrega automaticamente
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);
}
