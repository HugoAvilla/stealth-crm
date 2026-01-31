import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface CompanyCodeDisplayProps {
  code: string;
  title?: string;
  description?: string;
  showCard?: boolean;
}

export function CompanyCodeDisplay({ 
  code, 
  title = "Código da Empresa",
  description = "Compartilhe este código com membros da sua equipe para que eles possam solicitar acesso.",
  showCard = true 
}: CompanyCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: 'Código copiado!',
        description: 'O código foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código.',
        variant: 'destructive',
      });
    }
  };

  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 bg-muted rounded-xl p-4">
        <span className="text-3xl font-mono font-bold tracking-widest text-primary">
          {code}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {description}
      </p>
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          Use este código para adicionar novos membros à equipe
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
