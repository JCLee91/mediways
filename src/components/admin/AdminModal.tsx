import { ReactNode } from "react";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function AdminModal({ isOpen, onClose, title, children }: AdminModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1e2029] border border-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-medium text-white">{title}</h2>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {children}
        </div>
        
        <div className="p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}