import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Crown,
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Loader2,
  Shield,
  FileCheck,
  Search,
  Download
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SubscriptionsManager from '@/components/master/SubscriptionsManager';
import EmployeesManager from '@/components/master/EmployeesManager';

interface TermsAcceptance {
  id: number;
  user_id: string;
  user_email: string;
  user_name: string;
  terms_version: string;
  accepted_at: string;
  ip_address: string | null;
}

export default function Master() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [termsAcceptances, setTermsAcceptances] = useState<TermsAcceptance[]>([]);
  const [termsSearch, setTermsSearch] = useState("");

  useEffect(() => {
    fetchTermsAcceptances().finally(() => setIsLoading(false));
  }, []);



  const fetchTermsAcceptances = async () => {
    try {
      const { data, error } = await supabase
        .from('terms_acceptances' as any)
        .select('*')
        .order('accepted_at', { ascending: false });

      if (error) throw error;
      setTermsAcceptances((data || []) as unknown as TermsAcceptance[]);
    } catch (error) {
      console.error('Error fetching terms acceptances:', error);
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-primary" />
            Painel Master
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de assinaturas e sistema
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions" className="gap-2">
            <Shield className="h-4 w-4" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="terms" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Termos
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Funcionários
          </TabsTrigger>
        </TabsList>



        <TabsContent value="subscriptions" className="mt-6">
          <SubscriptionsManager />
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <EmployeesManager />
        </TabsContent>

        <TabsContent value="terms" className="space-y-6 mt-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Aceites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{termsAcceptances.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aceites no Último Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {termsAcceptances.filter(t => {
                    const d = new Date(t.accepted_at);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search + Export */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nome ou email..."
                value={termsSearch}
                onChange={(e) => setTermsSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const csv = ['Nome,Email,Versão,Data do Aceite,IP']
                  .concat(termsAcceptances.map(t =>
                    `"${t.user_name}","${t.user_email}","${t.terms_version}","${new Date(t.accepted_at).toLocaleString('pt-BR')}","${t.ip_address || ''}"`
                  )).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'termos_aceites.csv';
                a.click();
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Data do Aceite</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termsAcceptances
                    .filter(t => {
                      if (!termsSearch) return true;
                      const s = termsSearch.toLowerCase();
                      return t.user_name.toLowerCase().includes(s) || t.user_email.toLowerCase().includes(s);
                    })
                    .map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.user_name}</TableCell>
                        <TableCell>{t.user_email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">v{t.terms_version}</Badge>
                        </TableCell>
                        <TableCell>{new Date(t.accepted_at).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-muted-foreground">{t.ip_address || '—'}</TableCell>
                      </TableRow>
                    ))}
                  {termsAcceptances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        Nenhum aceite registrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
