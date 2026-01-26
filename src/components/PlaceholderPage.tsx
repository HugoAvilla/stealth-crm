import { MainLayout } from '@/components/layout/MainLayout';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <MainLayout>
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Construction className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Em desenvolvimento
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
