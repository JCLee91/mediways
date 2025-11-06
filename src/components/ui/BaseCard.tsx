import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BaseCardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 생성 메뉴 스타일을 기준으로 통일
const cardVariants = {
  default: "bg-black border border-gray-800",
  elevated: "bg-black border border-gray-800 shadow-lg",
  minimal: "bg-black/50 border border-gray-800/50"
};

const cardSizes = {
  sm: "p-4 rounded-2xl",
  md: "p-4 sm:p-6 rounded-2xl", 
  lg: "p-6 sm:p-8 rounded-2xl"
};

export default function BaseCard({ 
  children, 
  variant = 'default', 
  size = 'md',
  className 
}: BaseCardProps) {
  return (
    <div className={cn(
      cardVariants[variant],
      cardSizes[size],
      className
    )}>
      {children}
    </div>
  );
}
