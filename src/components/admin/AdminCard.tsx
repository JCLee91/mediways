import { LucideIcon } from "lucide-react";

interface AdminCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
}

export default function AdminCard({ title, value, icon: Icon }: AdminCardProps) {
  return (
    <div className="bg-[#1e2029] border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-medium text-white mt-1">{value}</p>
        </div>
        <Icon className="text-gray-600" size={24} />
      </div>
    </div>
  );
}