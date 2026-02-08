
# Plano: Configurar Ícones de Web App (PWA) com Logo WFE Evolution

## Objetivo

Substituir os ícones genéricos pela logo oficial da WFE Evolution para que o app apareça corretamente quando usuários adicionarem à tela inicial do iPhone/Android.

---

## Estado Atual

- **index.html**: Apenas referência ao `favicon.ico`
- **public/**: Contém `favicon.ico` (genérico), `placeholder.svg`, `robots.txt`
- **Manifesto**: Não existe
- **Apple Touch Icon**: Não configurado

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `public/lovable-uploads/apple-touch-icon.png` | Copiar logo (usada para iOS) |
| `public/lovable-uploads/icon-192x192.png` | Copiar logo (Android PWA) |
| `public/lovable-uploads/icon-512x512.png` | Copiar logo (Android PWA) |
| `public/favicon.png` | Copiar logo (favicon moderno) |
| `public/manifest.json` | Criar manifesto PWA |
| `index.html` | Atualizar tags de ícones |

---

## Detalhes Técnicos

### 1. Copiar Logo para Pasta Public

Copiar o arquivo `user-uploads://logo-wfe.png.png` para:
- `public/lovable-uploads/apple-touch-icon.png` (iOS 180x180)
- `public/lovable-uploads/icon-192x192.png` (Android)
- `public/lovable-uploads/icon-512x512.png` (Android splash)
- `public/favicon.png` (favicon moderno)

**Nota**: A imagem será usada diretamente. Idealmente deveria ser redimensionada, mas navegadores modernos fazem o redimensionamento automaticamente.

### 2. Criar Manifesto PWA

Criar `public/manifest.json`:

```json
{
  "name": "WFE Evolution",
  "short_name": "WFE CRM",
  "description": "CRM Comercial para Estética Automotiva",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F0F0F",
  "theme_color": "#0F0F0F",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/lovable-uploads/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/lovable-uploads/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 3. Atualizar index.html

Atualizar o `<head>` com todas as tags necessárias:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WFE Evolution - CRM Comercial para Estética Automotiva</title>
    <meta name="description" content="Sistema CRM completo para equipes comerciais de estética automotiva." />
    <meta name="author" content="WFE Evolution" />
    <meta name="theme-color" content="#0F0F0F" />
    
    <!-- Favicons -->
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    
    <!-- Apple Touch Icon (iOS Home Screen) -->
    <link rel="apple-touch-icon" sizes="180x180" href="/lovable-uploads/apple-touch-icon.png" />
    
    <!-- PWA Manifest (Android Home Screen) -->
    <link rel="manifest" href="/manifest.json" />
    
    <!-- Apple Mobile Web App Settings -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="WFE CRM" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="WFE Evolution - CRM Comercial" />
    <meta property="og:description" content="Sistema CRM completo para estética automotiva." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@WFEEvolution" />
    <meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Estrutura Final de Arquivos

```text
public/
  ├── favicon.ico (existente)
  ├── favicon.png (NOVO - logo WFE)
  ├── manifest.json (NOVO)
  ├── robots.txt (existente)
  └── lovable-uploads/
      ├── apple-touch-icon.png (NOVO - 180x180 iOS)
      ├── icon-192x192.png (NOVO - Android)
      └── icon-512x512.png (NOVO - Android splash)
```

---

## Tags Adicionadas ao HTML

| Tag | Propósito |
|-----|-----------|
| `<link rel="apple-touch-icon">` | Ícone para iOS Home Screen |
| `<link rel="manifest">` | Manifesto PWA para Android |
| `<meta name="apple-mobile-web-app-capable">` | Permite app em tela cheia no iOS |
| `<meta name="apple-mobile-web-app-status-bar-style">` | Estilo da barra de status iOS |
| `<meta name="apple-mobile-web-app-title">` | Nome do app no iOS |
| `<link rel="icon" type="image/png">` | Favicon PNG moderno |

---

## Resultado Esperado

Após implementação:
- **iPhone**: Ao adicionar à tela inicial, exibirá a logo WFE Evolution
- **Android**: Ao adicionar à tela inicial via Chrome, exibirá a logo WFE Evolution
- **Navegador**: Favicon atualizado com a logo WFE
- **PWA**: App instalável com identidade visual correta
