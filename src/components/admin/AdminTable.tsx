import { ReactNode } from "react";

interface AdminTableProps {
  headers: string[];
  children: ReactNode;
}

export default function AdminTable({ headers, children }: AdminTableProps) {
  return (
    <div className="bg-[#1e2029] border border-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}