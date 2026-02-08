
# Plano: Transformar em PWA Completo com Install Prompt

## Resumo Geral

Transformar o projeto em um Progressive Web App (PWA) completo com:
- Manifest atualizado com nome "CRM WFE" e cores #000000
- Service Worker via vite-plugin-pwa
- Componente de notificação de instalação que aparece após login bem-sucedido

---

## 1. Atualizar Manifest (public/manifest.json)

Alterar para usar estritamente "CRM WFE" como nome e aplicar cores #000000:

```json
{
  "name": "CRM WFE",
  "short_name": "CRM WFE",
  "description": "CRM Comercial para Estética Automotiva",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/pwa-icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/pwa-icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

## 2. Atualizar index.html

Alterar `theme-color` e `apple-mobile-web-app-title` para #000000 e "CRM WFE":

```html
<meta name="theme-color" content="#000000" />
<meta name="apple-mobile-web-app-title" content="CRM WFE" />
```

---

## 3. Copiar Ícone PWA

Copiar o ícone enviado pelo usuário para:
- `public/pwa-icon.png` (ícone principal)
- `public/pwa-icon-192x192.png` (Android 192x192)
- `public/pwa-icon-512x512.png` (Android 512x512)

---

## 4. Instalar vite-plugin-pwa

Adicionar ao `package.json` a dependência:
```json
"vite-plugin-pwa": "^0.20.0"
```

---

## 5. Configurar vite.config.ts

Adicionar plugin PWA com configuração de Service Worker:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  // ... existing config
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.png', 'pwa-icon.png'],
      manifest: false, // Use manual manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
}));
```

---

## 6. Criar Hook usePWAInstall

Criar `src/hooks/use-pwa-install.ts` para gerenciar o estado de instalação:

```typescript
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
    
    return outcome === 'accepted';
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall
  };
}
```

---

## 7. Criar Componente PWAInstallPrompt

Criar `src/components/pwa/PWAInstallPrompt.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { X, Share, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePWAInstall } from '@/hooks/use-pwa-install';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isAuthenticated } = useAuth();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  useEffect(() => {
    // Check if user dismissed in this session
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
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
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-b border-border shadow-lg animate-in slide-in-from-top">
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
            <Button 
              onClick={handleInstall}
              size="sm"
              className="gap-2"
            >
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
```

---

## 8. Adicionar PWAInstallPrompt ao App.tsx

Importar e renderizar o componente dentro do `AuthProvider`:

```typescript
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PWAInstallPrompt />  {/* NOVO */}
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `public/pwa-icon.png` | Copiar imagem enviada |
| `public/pwa-icon-192x192.png` | Copiar imagem (Android) |
| `public/pwa-icon-512x512.png` | Copiar imagem (Android) |
| `public/manifest.json` | Atualizar nomes e cores |
| `index.html` | Atualizar theme-color e title |
| `package.json` | Adicionar vite-plugin-pwa |
| `vite.config.ts` | Configurar VitePWA |
| `src/hooks/use-pwa-install.ts` | Criar hook |
| `src/components/pwa/PWAInstallPrompt.tsx` | Criar componente |
| `src/App.tsx` | Adicionar PWAInstallPrompt |

---

## Fluxo de Exibição do Install Prompt

```text
┌────────────────────────────────────────────────────────────────┐
│  Usuário faz login com sucesso                                 │
│                    ↓                                           │
│  AuthContext atualiza isAuthenticated = true                   │
│                    ↓                                           │
│  PWAInstallPrompt verifica:                                    │
│    ├── isAuthenticated? ✓                                      │
│    ├── isInstalled (standalone)? ✗                             │
│    └── isInstallable || isIOS? ✓                               │
│                    ↓                                           │
│  Aguarda 2 segundos (não interrompe fluxo)                     │
│                    ↓                                           │
│  Exibe banner no topo da tela:                                 │
│    ├── Android/Desktop: Botão "Instalar"                       │
│    └── iOS: Instruções "Toque em Compartilhar..."              │
│                    ↓                                           │
│  Usuário clica "Instalar" ou "X" para dispensar                │
└────────────────────────────────────────────────────────────────┘
```

---

## Resultado Visual

O banner aparecerá assim após o login:

```text
┌────────────────────────────────────────────────────────────────┐
│  [LOGO]  CRM WFE                              [Instalar] [X]   │
│          Instale nosso App para uma melhor experiência         │
└────────────────────────────────────────────────────────────────┘
```

Para iOS:
```text
┌────────────────────────────────────────────────────────────────┐
│  [LOGO]  CRM WFE              Toque em ⬆ e selecione    [X]   │
│          Instale nosso App... ➕ "Adicionar à Tela de Início"  │
└────────────────────────────────────────────────────────────────┘
```
