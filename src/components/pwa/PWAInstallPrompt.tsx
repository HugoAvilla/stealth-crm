import { useState, useEffect } from "react";
import { X, Share, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isAuthenticated } = useAuth();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  useEffect(() => {
    // Check if user dismissed in this session
    const wasDismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt only if:
    // 1. User is authenticated
    // 2. App is NOT installed (not standalone)
    // 3. Either installable (Android/Desktop) OR iOS
    // 4. Not dismissed
    if (isAuthenticated && !isInstalled && !dismissed) {
      if (isInstallable || isIOS) {
        // Small delay after login to not interrupt flow
        const timer = setTimeout(() => setShowPrompt(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, isInstalled, isInstallable, isIOS, dismissed]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg animate-in slide-in-from-bottom">
      <div className="max-w-lg mx-auto flex items-center gap-4">
        {/* Logo */}
        <img
          src="/pwa-icon.png"
          alt="CRM WFE"
          className="w-14 h-14 rounded-xl shadow-md"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">CRM WFE</h3>
          <p className="text-sm text-muted-foreground">
            Instale nosso App para uma melhor experiência
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isIOS ? (
            // iOS Instructions
            <div className="text-xs text-muted-foreground text-right">
              <p className="flex items-center gap-1">
                Toque em <Share className="w-4 h-4" /> e selecione
              </p>
              <p className="flex items-center gap-1">
                <Plus className="w-4 h-4" /> "Adicionar à Tela de Início"
              </p>
            </div>
          ) : (
            // Android/Desktop Install Button
            <Button onClick={handleInstall} size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Instalar
            </Button>
          )}

          {/* Dismiss Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
