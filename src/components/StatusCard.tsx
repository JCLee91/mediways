import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

export type StatusType = 'good' | 'warning' | 'error';

interface StatusCardProps {
  title: string;
  message: string;
  details?: string;
  status: StatusType;
}

export default function StatusCard({ title, message, details, status }: StatusCardProps) {
  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-400" size={20} />;
      case 'error':
        return <XCircle className="text-red-400" size={20} />;
    }
  };

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'good':
        return 'border-green-400/50 bg-green-400/10';
      case 'warning':
        return 'border-yellow-400/50 bg-yellow-400/10';
      case 'error':
        return 'border-red-400/50 bg-red-400/10';
    }
  };

  return (
    <div className={`border rounded-2xl p-4 ${getStatusColor(status)}`}>
      <div className="flex items-start gap-3">
        {getStatusIcon(status)}
        <div className="flex-1">
          <h4 className="font-medium text-white mb-1">{title}</h4>
          <p className="text-sm text-gray-300 mb-2">{message}</p>
          {details && (
            <p className="text-xs text-gray-400">{details}</p>
          )}
        </div>
      </div>
    </div>
  );
}
