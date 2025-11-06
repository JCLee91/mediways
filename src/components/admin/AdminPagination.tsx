import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsInfo?: string;
}

export default function AdminPagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  itemsInfo 
}: AdminPaginationProps) {
  return (
    <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-between">
      {itemsInfo && (
        <div className="text-sm text-gray-400">
          {itemsInfo}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <span className="px-3 py-2 text-sm text-gray-400">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}