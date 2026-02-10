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

interface DiscountCoupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  description: string | null;
  is_active: boolean;
  usage_limit: number | null;
  usage_count: number;
  valid_until: string | null;
  created_at: string;
}

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
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAcceptances, setTermsAcceptances] = useState<TermsAcceptance[]>([]);
  const [termsSearch, setTermsSearch] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    description: '',
    usage_limit: '',
    valid_until: ''
  });

  useEffect(() => {
    fetchCoupons();
    fetchTermsAcceptances();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as DiscountCoupon[]);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: 'Erro ao carregar cupons',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      toast({ title: 'Digite o código do cupom', variant: 'destructive' });
      return;
    }

    if (formData.discount_value <= 0) {
      toast({ title: 'O valor do desconto deve ser maior que zero', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .insert({
          code: formData.code.toUpperCase().trim(),
          discount_type: formData.discount_type,
          discount_value: formData.discount_value,
          description: formData.description || null,
          usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          valid_until: formData.valid_until || null,
          created_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Este código já existe', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'Cupom criado com sucesso!' });
      setShowModal(false);
      fetchCoupons();
      resetForm();
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast({ title: 'Erro ao criar cupom', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({ title: currentStatus ? 'Cupom desativado' : 'Cupom ativado' });
      fetchCoupons();
    } catch (error) {
      console.error('Error toggling coupon:', error);
      toast({ title: 'Erro ao atualizar cupom', variant: 'destructive' });
    }
  };

  const deleteCoupon = async (id: number) => {
    if (!confirm('Deseja realmente excluir este cupom?')) return;

    try {
      const { error } = await supabase
        .from('discount_coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Cupom excluído' });
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({ title: 'Erro ao excluir cupom', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      description: '',
      usage_limit: '',
      valid_until: ''
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sem limite';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-primary" />
            Painel Master
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de cupons e assinaturas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="coupons">
        <TabsList>
          <TabsTrigger value="coupons" className="gap-2">
            <Tag className="h-4 w-4" />
            Cupons
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <Shield className="h-4 w-4" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="terms" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Termos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cupom
            </Button>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Cupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cupons Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {coupons.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Usos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coupons.reduce((sum, c) => sum + c.usage_count, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cupons Inativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {coupons.filter(c => !c.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Cupons de Desconto
          </CardTitle>
          <CardDescription>
            Gerencie os cupons de desconto para assinaturas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cupom cadastrado</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro cupom
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono font-bold">{coupon.code}</span>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground">{coupon.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {coupon.discount_type === 'percentage' ? (
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        )}
                        {coupon.discount_type === 'percentage' ? 'Porcentagem' : 'Valor Fixo'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.discount_type === 'percentage' 
                        ? `${coupon.discount_value}%`
                        : `R$ ${coupon.discount_value.toFixed(2)}`
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {coupon.usage_count} / {coupon.usage_limit || '∞'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(coupon.valid_until)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.is_active ? (
                        <Badge variant="default" className="bg-green-500">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(coupon.id, coupon.is_active)}
                          title={coupon.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {coupon.is_active ? (
                            <ToggleRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCoupon(coupon.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <SubscriptionsManager />
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
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cupom de Desconto</DialogTitle>
            <DialogDescription>
              Crie um cupom de desconto para assinaturas
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código do Cupom *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="Ex: ALUNO10"
                className="font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_type">Tipo de Desconto *</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: 'percentage' | 'fixed') => 
                  setFormData({...formData, discount_type: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">
                Valor do Desconto * {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                min="0"
                step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                value={formData.discount_value}
                onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                placeholder={formData.discount_type === 'percentage' ? '10' : '50.00'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Desconto para alunos"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_limit">Limite de Usos (opcional)</Label>
              <Input
                id="usage_limit"
                type="number"
                min="1"
                value={formData.usage_limit}
                onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                placeholder="Deixe vazio para ilimitado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Validade (opcional)</Label>
              <Input
                id="valid_until"
                type="datetime-local"
                value={formData.valid_until}
                onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Cupom'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
