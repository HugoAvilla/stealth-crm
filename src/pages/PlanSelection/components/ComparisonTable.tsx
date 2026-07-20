import { Check, X } from "lucide-react";
import { Feature } from "../types";

interface ComparisonTableProps {
    features: Feature[];
}

export function ComparisonTable({ features }: ComparisonTableProps) {
    const renderFeatureValue = (val: boolean | string) => {
        if (typeof val === 'string') return <span className="font-medium">{val}</span>;
        return val ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />;
    };

    return (
        <div className="mt-24">
            <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-12">Compare os recursos</h3>

            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="py-4 px-6 font-semibold text-gray-900 dark:text-white w-1/4">Recurso</th>
                            <th className="py-4 px-6 font-semibold text-center text-gray-900 dark:text-white w-1/4">Básico</th>
                            <th className="py-4 px-6 font-semibold text-center text-primary w-1/4">Ultra</th>
                            <th className="py-4 px-6 font-semibold text-center text-gray-500 w-1/4">Premium</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {features.map((feature, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300 font-medium">{feature.name}</td>
                                <td className="py-4 px-6 text-center">{renderFeatureValue(feature.basic)}</td>
                                <td className="py-4 px-6 text-center">{renderFeatureValue(feature.ultra)}</td>
                                <td className="py-4 px-6 text-center opacity-50">{renderFeatureValue(feature.premium)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Comparison view */}
            <div className="lg:hidden space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="font-semibold text-center">Básico</h4>
                    </div>
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {features.map((feature, idx) => (
                            <li key={idx} className="flex justify-between py-3 px-4 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{feature.name}</span>
                                <span>{renderFeatureValue(feature.basic)}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-primary overflow-hidden">
                    <div className="bg-primary/5 px-4 py-3 border-b border-primary/20">
                        <h4 className="font-semibold text-center text-primary">Ultra</h4>
                    </div>
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {features.map((feature, idx) => (
                            <li key={idx} className="flex justify-between py-3 px-4 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{feature.name}</span>
                                <span>{renderFeatureValue(feature.ultra)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
