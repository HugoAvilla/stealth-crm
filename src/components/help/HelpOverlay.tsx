import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

interface HelpStep {
  title: string;
  description: string;
}

interface HelpOverlayProps {
  tabId: string;
  title: string;
  description: string;
  imageUrl?: string;
  steps?: HelpStep[];
}

export function HelpOverlay({ tabId, title, description, imageUrl, steps }: HelpOverlayProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reseta e re-avalia toda vez que a página (tabId) muda
    const isDismissed = !!localStorage.getItem(`help-dismissed-${tabId}`);
    setDismissed(isDismissed);
    setShow(false);

    if (!isDismissed) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [tabId]);

  const handleClose = () => {
    localStorage.setItem(`help-dismissed-${tabId}`, 'true');
    setDismissed(true);
    setShow(false);
  };

  return (
    <>
      {/* Botão flutuante "?" — sempre visível no canto superior direito */}
      <button
        onClick={() => setShow(true)}
        title="Ajuda"
        className="fixed top-[72px] right-4 z-40 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {/* Modal de ajuda */}
      <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle>{title}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={title}
                className="w-full rounded-lg border border-border"
              />
            )}

            <p className="text-muted-foreground">{description}</p>

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
        </DialogContent>
      </Dialog>
    </>
  );
}
