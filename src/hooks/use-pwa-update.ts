import { useEffect } from "react";

export function usePWAUpdate() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // If we just reloaded, clear the flag
    if (sessionStorage.getItem("pwa-reloading")) {
      sessionStorage.removeItem("pwa-reloading");
      return;
    }

    const handleControllerChange = () => {
      if (sessionStorage.getItem("pwa-reloading")) return;
      sessionStorage.setItem("pwa-reloading", "true");
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);
}
