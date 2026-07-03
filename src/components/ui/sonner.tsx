import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as rawToast } from "sonner";
import { getSupabaseReadOnly } from "@/integrations/supabase/client";

// Custom wrapper around sonner toast to intercept errors in read-only mode
const toast = new Proxy(rawToast, {
  get(target, prop, receiver) {
    if (prop === 'error') {
      return (message: any, options?: any) => {
        if (getSupabaseReadOnly()) {
          return target.error(
            "Modo de leitura ativo: Regularize sua assinatura pelo WhatsApp no topo da tela para realizar alterações.",
            options
          );
        }
        return target.error(message, options);
      };
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  },
  apply(target, thisArg, argList) {
    const [message, options] = argList;
    if (getSupabaseReadOnly() && typeof message === 'string' && message.toLowerCase().includes('erro')) {
      return target.error(
        "Modo de leitura ativo: Regularize sua assinatura pelo WhatsApp no topo da tela para realizar alterações."
      );
    }
    return Reflect.apply(target, thisArg, argList);
  }
}) as typeof rawToast;

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
