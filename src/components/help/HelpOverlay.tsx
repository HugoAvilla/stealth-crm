import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';

interface HelpSection {
  title: string;
  description: string;
  screenshotUrl?: string;
  videoUrl?: string;
}

interface HelpStep {
  title: string;
  description: string;
}

interface HelpOverlayProps {
  tabId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  steps?: HelpStep[];
  sections?: HelpSection[];
}

export function HelpOverlay({ tabId, title, description, imageUrl, steps, sections }: HelpOverlayProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDismissed = !!localStorage.getItem(`help-dismissed-${tabId}`);
    setDismissed(isDismissed);
    setShow(false);

    if (!isDismissed) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [tabId]);

  // Check scroll state
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !show) return;

    const checkScroll = () => {
      setCanScrollUp(el.scrollTop > 10);
      setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
    };

    // Delay the initial check to allow content to render
    const timer = setTimeout(checkScroll, 100);
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [show, sections, steps]);

  const handleClose = () => {
    localStorage.setItem(`help-dismissed-${tabId}`, 'true');
    setDismissed(true);
    setShow(false);
  };

  const scrollTo = (direction: 'up' | 'down') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: direction === 'up' ? -200 : 200, behavior: 'smooth' });
  };

  const hasSections = sections && sections.length > 0;

  return (
    <>
      {/* Botão flutuante "?" — sempre visível no canto superior direito */}
      <button
        onClick={() => setShow(true)}
        title="Ajuda"
        className="fixed top-[130px] right-4 z-40 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {/* Modal de ajuda */}
      <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className={hasSections ? "sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col" : "sm:max-w-lg"}>
          {/* Header */}
          <DialogHeader className={hasSections ? "px-6 pt-6 pb-4 border-b border-border shrink-0" : ""}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle>{title}</DialogTitle>
            </div>
          </DialogHeader>

          {hasSections ? (
            /* ======================== NOVO LAYOUT COM SEÇÕES ======================== */
            <>
              {/* Conteúdo rolável */}
              <div className="relative flex-1 min-h-0">
                <div
                  ref={scrollRef}
                  className="overflow-y-auto px-6 py-4"
                  style={{ maxHeight: 'calc(90vh - 170px)' }}
                >
                  <div className="space-y-6">
                    {sections.map((section, index) => (
                      <div key={index} className="space-y-3">
                        {/* Número e título da seção */}
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">
                            {index + 1}
                          </span>
                          <h3 className="text-base font-semibold text-foreground">
                            {section.title}
                          </h3>
                        </div>

                        {/* Video */}
                        {section.videoUrl && (
                          <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                            <video
                              src={section.videoUrl}
                              controls
                              preload="metadata"
                              className="w-full h-auto"
                              style={{ maxHeight: '360px' }}
                            >
                              Seu navegador não suporta o elemento de vídeo.
                            </video>
                          </div>
                        )}

                        {/* Screenshot */}
                        {section.screenshotUrl && !section.videoUrl && (
                          <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                            <img
                              src={section.screenshotUrl}
                              alt={section.title}
                              className="w-full h-auto object-contain"
                              loading="lazy"
                              onError={(e) => {
                                // Esconde a imagem caso não exista
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* Descrição */}
                        <p className="text-sm text-muted-foreground leading-relaxed pl-10">
                          {section.description}
                        </p>

                        {/* Separador (exceto no último) */}
                        {index < sections.length - 1 && (
                          <div className="border-t border-border/50 pt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botões de scroll flutuantes */}
                {canScrollUp && (
                  <button
                    onClick={() => scrollTo('up')}
                    className="absolute top-2 right-8 z-10 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Rolar para cima"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                )}
                {canScrollDown && (
                  <button
                    onClick={() => scrollTo('down')}
                    className="absolute bottom-2 right-8 z-10 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Rolar para baixo"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Footer fixo */}
              <div className="px-6 py-4 border-t border-border shrink-0">
                <div className="flex justify-end">
                  <Button onClick={handleClose}>Entendi, não mostrar novamente</Button>
                </div>
              </div>
            </>
          ) : (
            /* ======================== LAYOUT LEGADO (compatibilidade) ======================== */
            <div className="space-y-4">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full rounded-lg border border-border"
                />
              )}

              {description && (
                <p className="text-muted-foreground">{description}</p>
              )}

              {steps && steps.length > 0 && (
                <ol className="list-decimal pl-5 space-y-2">
                  {steps.map((step, index) => (
                    <li key={index} className="text-sm">
                      <span className="font-medium text-foreground">{step.title}:</span>{' '}
                      <span className="text-muted-foreground">{step.description}</span>
                    </li>
                  ))}
                </ol>
              )}

              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={handleClose}>Entendi, não mostrar novamente</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
