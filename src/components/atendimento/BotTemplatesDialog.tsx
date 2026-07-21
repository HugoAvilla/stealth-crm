import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, X, MessageCircle, Instagram, Facebook, Mail, Monitor, Hash, ShoppingCart, Bot, Heart, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BotTemplate {
    id: string;
    title: string;
    image: string;
    category: string;
}

const TEMPLATES: BotTemplate[] = [
    { id: "boas-vindas", title: "Bot de boas-vindas", image: "/templates/boas-vindas.png", category: "Gerar leads" },
    { id: "agendamentos-1", title: "Confirme agendamentos", image: "/templates/confirme-agendamentos.png", category: "Gerar leads" },
    { id: "agendamentos-2", title: "Receba agendamentos", image: "/templates/receba-agendamentos.png", category: "Gerar leads" },
    { id: "capture-leads", title: "Capture leads que desejam uma chamada", image: "/templates/capture-leads.png", category: "Gerar leads" },
    { id: "tiktok-leads", title: "Facilite para os leads do TikTok solicitarem uma chamada", image: "/templates/tiktok-leads.png", category: "Engajar leads" },
    { id: "story-promo", title: "Compartilhe códigos promocionais para menções em story", image: "/templates/story-promo.png", category: "Engajar leads" },
    { id: "ig-comments", title: "Responda a palavras-chave nos comentários", image: "/templates/ig-comments.png", category: "Engajar leads" },
    { id: "tiktok-comments", title: "Responder a palavras-chave nos TikTok comentários", image: "/templates/tiktok-comments.png", category: "Engajar leads" },

    // Novos (Print 1)
    { id: "tiktok-comments-coracao", title: "Responda aos comentários do TikTok com um coração e uma resposta personalizada", image: "/templates/tiktok-heart.png", category: "Engajar leads" },
    { id: "story-reactions", title: "Reaja às menções em stories c/ um coração e mensagem personalizada", image: "/templates/story-reactions.png", category: "Engajar leads" },
    { id: "exclusive-rewards", title: "Compartilhe recompensas exclusivas com seguidores", image: "/templates/exclusive-rewards.png", category: "Engajar leads" },
    { id: "tiktok-rewards", title: "Recompense seguidores do TikTok por enviarem palavras-chave", image: "/templates/tiktok-rewards.png", category: "Engajar leads" },
    { id: "promo-messages", title: "Agende mensagens promocionais sobre eventos, ofertas e muito mais", image: "/templates/promo-messages.png", category: "Informações comerciais" },
    { id: "promo-codes", title: "Envie cód. promocionais com base em palavras-chave de mensagens", image: "/templates/promo-codes.png", category: "Informações comerciais" },
    { id: "greet-leads", title: "Cumprimente leads com uma mensagem personalizada", image: "/templates/greet-leads.png", category: "Gerar leads" },
    { id: "greet-tiktok-ads", title: "Cumprimente clientes de anúncios do TikTok com uma mensagem", image: "/templates/greet-tiktok-ads.png", category: "Gerar leads" },

    // Novos (Print 2)
    { id: "webinar-signup", title: "Colete inscrições para webinars", image: "/templates/webinar-signup.png", category: "Gerar leads" },
    { id: "gifts-keywords", title: "Envie brindes com base em palavras-chave de mensagens", image: "/templates/gifts-keywords.png", category: "Engajar leads" },
    { id: "tiktok-giveaway", title: "Aumente o engajamento no TikTok com um sorteio", image: "/templates/tiktok-giveaway.png", category: "Engajar leads" },
    { id: "tiktok-gifts", title: "Envie brindes quando clientes enviarem palavras-chave no TikTok", image: "/templates/tiktok-gifts.png", category: "Engajar leads" },
    { id: "route-specialists", title: "Encaminhe solicitações para os especialistas certos", image: "/templates/route-specialists.png", category: "Reduzir retrabalho" },
    { id: "route-tiktok", title: "Conecte leads do TikTok com o especialista certo", image: "/templates/route-tiktok.png", category: "Reduzir retrabalho" },
    { id: "fb-broadcast", title: "Inscreva leads em suas transmissões do Facebook", image: "/templates/fb-broadcast.png", category: "Gerar leads" },
    { id: "lead-survey", title: "Saiba mais sobre leads com uma pesquisa rápida", image: "/templates/lead-survey.png", category: "Informações comerciais" },

    // Novos (Print 3)
    { id: "feedback-emojis", title: "Colete feedback com emojis", image: "/templates/feedback-emojis.png", category: "Informações comerciais" },
    { id: "email-newsletter", title: "Inscreva leads em sua newsletter de email", image: "/templates/email-newsletter.png", category: "Gerar leads" },
    { id: "offline-messages", title: "Receba recados quando estiver offline", image: "/templates/offline-messages.png", category: "Reduzir retrabalho" },
    { id: "sales-preferences", title: "Ajude a equipe de vendas a conhecer o lead e suas preferências", image: "/templates/sales-preferences.png", category: "Reduzir retrabalho" },
    { id: "round-robin", title: "Encaminhe conversas para membros da equipe usando o Round Robin", image: "/templates/round-robin.png", category: "Reduzir retrabalho" },
];

const CHANNELS = [
    { id: "whatsapp", label: "WhatsApp Business", icon: MessageCircle, color: "text-green-500" },
    { id: "telegram", label: "Telegram", icon: MessageCircle, color: "text-blue-400" }, // Using MessageCircle as fallback
    { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
    { id: "tiktok", label: "TikTok", icon: Hash, color: "text-black dark:text-white" },
    { id: "messenger", label: "Messenger", icon: Facebook, color: "text-blue-600" },
    { id: "email", label: "Email", icon: Mail, color: "text-gray-600" },
    { id: "chat", label: "Chat ao vivo", icon: Monitor, color: "text-blue-500" },
];

export function BotTemplatesDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState("Todos os modelos");

    const categories = ["Todos os modelos", "Gerar leads", "Informações comerciais", "Engajar leads", "Reduzir retrabalho"];

    const filteredTemplates = selectedCategory === "Todos os modelos"
        ? TEMPLATES
        : TEMPLATES.filter(t => t.category === selectedCategory || selectedCategory === "Todos os modelos"); // Simple mock filter

    const handleCreateZero = () => {
        onOpenChange(false);
        navigate('/atendimento/editor/new?type=salesbot');
    };

    const renderCardVisual = (template: BotTemplate) => {
        return (
            <img
                src={template.image}
                alt={template.title}
                className="absolute inset-0 w-full h-full text-[0px] font-[0px] text-transparent object-cover z-10"
                onError={(e) => {
                    // Fallback in case image is missing
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                }}
            />
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] p-0 overflow-hidden flex bg-background border-none shadow-2xl rounded-xl [&>button.absolute]:hidden">
                <DialogTitle className="sr-only">Modelos de Chatbot</DialogTitle>

                {/* Sidebar */}
                <div className="w-[280px] bg-card border-r border-border/50 flex flex-col h-full shrink-0">
                    <div className="p-6 pb-4">
                        <h2 className="text-xl font-medium text-foreground mb-6">Criar um bot</h2>
                        <Button
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-sm transition-all"
                            onClick={handleCreateZero}
                        >
                            Começar do zero
                        </Button>
                    </div>

                    <div className="px-6 py-2 flex-1 overflow-y-auto">
                        <h3 className="font-semibold text-foreground mb-4">Canais</h3>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <Checkbox className="border-muted-foreground/30 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">Selecionar tudo</span>
                            </label>

                            {CHANNELS.map(channel => (
                                <label key={channel.id} className="flex items-center gap-3 cursor-pointer group">
                                    <Checkbox className="border-muted-foreground/30 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
                                    <div className="flex items-center gap-2">
                                        <channel.icon className={`w-4 h-4 ${channel.color}`} />
                                        <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">{channel.label}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
                    {/* Top Topbar with Close */}
                    <div className="flex justify-between items-center px-6 py-4 border-b border-border/50">
                        <div className="flex gap-6 overflow-x-auto no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`whitespace-nowrap text-sm font-medium transition-colors ${selectedCategory === cat
                                        ? 'text-blue-500 border-b-2 border-blue-500 pb-1 -mb-[19px]'
                                        : 'text-muted-foreground hover:text-foreground pb-1'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:bg-accent shrink-0 -mr-2"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-8 pt-6">
                        {/* AI Banner */}
                        <div className="mb-8 border border-border/50 rounded-lg p-4 flex items-center justify-between bg-card shrink-0 shadow-sm cursor-pointer hover:border-blue-500/30 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600/10 p-2.5 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground group-hover:text-blue-500 transition-colors">
                                        Experimente o Agente de IA — comunicação com o cliente automatizada
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Você pode começar gratuitamente com um modelo pronto ou criar o seu próprio agente do zero.
                                    </p>
                                </div>
                            </div>
                            <div className="text-muted-foreground transition-transform group-hover:translate-x-1">
                                &rsaquo;
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTemplates.map(template => (
                                <div key={template.id} className="group cursor-pointer flex flex-col">
                                    <div className="aspect-[1.6/1] bg-muted/30 border border-border/50 rounded-lg overflow-hidden mb-3 relative flex items-center justify-center transition-all group-hover:shadow-md group-hover:border-border">
                                        <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted/20 relative">
                                            {renderCardVisual(template)}
                                            {/* Placeholder fallback visual */}
                                            <div className="absolute inset-0 flex items-center justify-center -z-10 bg-accent/20">
                                                <span className="text-muted-foreground/30 text-xs text-center px-4 font-medium max-w-[80%] leading-tight">
                                                    Imagem pendente ({template.id})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-medium text-foreground tracking-tight leading-snug group-hover:text-blue-500 transition-colors">
                                        {template.title}
                                    </h4>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
