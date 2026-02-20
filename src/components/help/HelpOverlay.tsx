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

  useEffect(() => {
    const dismissed = localStorage.getItem(`help-dismissed-${tabId}`);
    if (!dismissed) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [tabId]);

  const handleClose = () => {
    // Sempre salva no localStorage, independente de como o modal foi fechado
    localStorage.setItem(`help-dismissed-${tabId}`, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
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
  );
}
