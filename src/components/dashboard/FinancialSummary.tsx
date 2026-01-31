import { dashboardStats, accounts } from '@/lib/mockData';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function FinancialSummary() {
  const navigate = useNavigate();
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const entriesTotal = 5200; // Mock data
  const expensesTotal = 1800; // Mock data

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-medium text-muted-foreground">
          Resumo Financeiro
        </h3>
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Main Balance */}
      <div className="mb-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Saldo Atual
        </p>
        <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
          R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Entries & Expenses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entradas hoje</p>
              <p className="text-sm font-semibold text-success">
                + R$ {entriesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saídas hoje</p>
              <p className="text-sm font-semibold text-destructive">
                - R$ {expensesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Preview */}
      <div className="mt-5 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-3">
          {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'} cadastradas
        </p>
        <div className="flex -space-x-2">
          {accounts.slice(0, 3).map((account) => (
            <div
              key={account.id}
              className="w-8 h-8 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center"
              title={account.name}
            >
              <span className="text-xs font-medium text-primary">
                {account.name.charAt(0)}
              </span>
            </div>
          ))}
          {accounts.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">
                +{accounts.length - 3}
              </span>
            </div>
          )}
        </div>
        
        {/* Botão Ver Financeiro */}
        <div className="mt-4">
          <Button 
            onClick={() => navigate('/financeiro')}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Ver Financeiro Completo
          </Button>
        </div>
      </div>
    </div>
  );
}
