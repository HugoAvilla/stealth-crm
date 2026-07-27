import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSend: (text: string) => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageComposer({ onSend, sending, disabled, placeholder }: Props) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t || disabled || sending) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="p-3 border-t bg-background flex items-end gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder || "Escreva uma mensagem…"}
        disabled={disabled}
        rows={1}
        className="min-h-[40px] max-h-32 resize-none"
      />
      <Button size="icon" className="shrink-0 h-10 w-10" onClick={submit} disabled={disabled || sending || !text.trim()}>
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </div>
  );
}
