import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    Cell
} from "recharts";

interface ClientChartsTabProps {
    clients: any[];
    sales: any[];
}

export function ClientChartsTab({ clients, sales }: ClientChartsTabProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handlePrevMonth = () => {
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    const monthName = selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const selectedYear = selectedDate.getFullYear();

    // Mapear primeira compra de cada cliente para determinar "Novo" vs "Retorno"
    const clientFirstSaleMap = useMemo(() => {
        const map = new Map<number, Date>();
        sales.forEach(sale => {
            const saleDate = new Date(sale.created_at);
            const existing = map.get(sale.client_id);
            if (!existing || saleDate < existing) {
                map.set(sale.client_id, saleDate);
            }
        });
        return map;
    }, [sales]);

    // Gráfico 1: Mensal (Novos vs Retorno)
    const monthlyStatusData = useMemo(() => {
        const month = selectedDate.getMonth();
        const year = selectedDate.getFullYear();

        const clientsInMonth = new Set<number>();
        sales.forEach(s => {
            const d = new Date(s.created_at);
            if (d.getMonth() === month && d.getFullYear() === year) {
                clientsInMonth.add(s.client_id);
            }
        });

        let novos = 0;
        let retorno = 0;

        clientsInMonth.forEach(clientId => {
            const firstSale = clientFirstSaleMap.get(clientId);
            if (firstSale && firstSale.getMonth() === month && firstSale.getFullYear() === year) {
                novos++;
            } else {
                retorno++;
            }
        });

        return [
            { name: "Novos", value: novos, fill: "#3b82f6" }, // blue-500
            { name: "Retornos", value: retorno, fill: "#10b981" } // emerald-500
        ];
    }, [sales, selectedDate, clientFirstSaleMap]);

    // Gráfico 2: Mensal (Origens)
    const monthlyOriginsData = useMemo(() => {
        const month = selectedDate.getMonth();
        const year = selectedDate.getFullYear();

        const clientsInMonth = new Set<number>();
        sales.forEach(s => {
            const d = new Date(s.created_at);
            if (d.getMonth() === month && d.getFullYear() === year) {
                clientsInMonth.add(s.client_id);
            }
        });

        const originCounts: Record<string, number> = {};
        clientsInMonth.forEach(clientId => {
            const client = clients.find(c => c.id === clientId);
            // Fallback default or mapped from standard fields
            const origin = (client?.origem && client.origem.trim() !== "") ? client.origem : "Outros";
            originCounts[origin] = (originCounts[origin] || 0) + 1;
        });

        const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#6366f1", "#f43f5e", "#14b8a6"];

        return Object.entries(originCounts)
            .map(([name, value], index) => ({
                name,
                value,
                fill: colors[index % colors.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [sales, clients, selectedDate]);

    // Gráfico 3: Anual (3 linhas)
    const annualData = useMemo(() => {
        const year = selectedDate.getFullYear();
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

        return months.map((monthLabel, index) => {
            const clientsInThisMonth = new Set<number>();
            sales.forEach(s => {
                const d = new Date(s.created_at);
                if (d.getMonth() === index && d.getFullYear() === year) {
                    clientsInThisMonth.add(s.client_id);
                }
            });

            let novos = 0;
            let retornos = 0;

            clientsInThisMonth.forEach(clientId => {
                const firstSale = clientFirstSaleMap.get(clientId);
                if (firstSale && firstSale.getMonth() === index && firstSale.getFullYear() === year) {
                    novos++;
                } else {
                    retornos++;
                }
            });

            return {
                name: monthLabel,
                Novos: novos,
                Retornos: retornos,
                Total: novos + retornos
            };
        });
    }, [sales, selectedDate, clientFirstSaleMap]);

    // Formatação em maiúscula para exibição
    const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    return (
        <div className="space-y-6">
            {/* Seletor de Mês */}
            <div className="flex justify-center items-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xl font-medium w-[200px] text-center">
                    {capitalizedMonthName}
                </div>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico 1 */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-muted-foreground">
                            Novos vs Retornos ({capitalizedMonthName})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={monthlyStatusData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={50}>
                                        {
                                            monthlyStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Gráfico 2 */}
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-muted-foreground">
                            Origens dos Clientes ({capitalizedMonthName})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={monthlyOriginsData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" width={100} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={40}>
                                        {
                                            monthlyOriginsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico Anual (Linhas) */}
            <Card className="bg-card/50 border-border/50 mt-6">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-muted-foreground">
                        Acompanhamento Mensal ({selectedYear})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={annualData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="Novos"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Retornos"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Total"
                                    stroke="#f59e0b"
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
