import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  unit?: string;
  change?: number;
  isGood?: boolean;
  isLoading?: boolean;
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  unit = "",
  change = 0,
  isGood = true,
  isLoading = false
}: MetricCardProps) {
  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 bg-[#4f84f5]/20 rounded-lg flex-shrink-0">
            <Icon size={24} className="text-[#4f84f5]" />
          </div>
          <h3 className="text-sm sm:text-base font-medium text-gray-300 leading-tight">{title}</h3>
        </div>
        {change !== 0 && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            (change > 0 && isGood) || (change < 0 && !isGood)
              ? 'text-green-400 bg-green-400/20'
              : 'text-red-400 bg-red-400/20'
          }`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div className="flex items-end gap-2 mt-auto">
        <span className="text-2xl sm:text-3xl font-bold text-white">
          {isLoading ? "..." : value}
        </span>
        <span className="text-sm sm:text-base text-gray-400 mb-1 font-medium">{unit}</span>
      </div>
    </div>
  );
}