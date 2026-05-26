import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full bg-card border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl shadow-black/40 backdrop-blur-sm relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-destructive to-transparent opacity-60 animate-pulse" />

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Ops! Algo deu errado.
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ocorreu um erro inesperado ao carregar esta seção. Você pode tentar recarregar ou limpar o cache do navegador.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="rounded-lg bg-black/40 border border-white/5 p-4 overflow-auto max-h-[150px] text-left">
                <p className="text-xs font-mono text-destructive font-semibold">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed select-all">
                    {this.state.error.stack.split("\n").slice(1, 4).join("\n")}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1 h-11"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Recarregar
              </Button>
              <Button
                onClick={this.handleClearCache}
                className="flex-1 h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Cache
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
