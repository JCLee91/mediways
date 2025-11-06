'use client';

import React from 'react';
import { MEDICAL_SPECIALTIES, type MedicalSpecialtyValue } from '@/types/medical-specialty';

interface MedicalSpecialtySelectProps {
  value?: MedicalSpecialtyValue;
  onChange: (value: MedicalSpecialtyValue | undefined) => void;
  className?: string;
}

export default function MedicalSpecialtySelect({ value, onChange, className = '' }: MedicalSpecialtySelectProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-white">
        진료과목 선택 <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {MEDICAL_SPECIALTIES.map((specialty) => (
          <button
            key={specialty.value}
            type="button"
            onClick={() => onChange(value === specialty.value ? undefined : specialty.value)}
            className={`w-full py-2.5 px-4 text-left rounded-xl text-sm font-medium transition-all ${
              value === specialty.value
                ? 'bg-[#4f84f5] text-white'
                : 'border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            <div className="text-sm font-medium">
              {specialty.label}
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        해당 진료과목에 맞는 톤과 키워드로 콘텐츠가 생성됩니다.
      </p>
    </div>
  );
}
