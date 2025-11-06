"use client";

import { useState } from "react";
import ContentGeneratorForm from "@/components/ContentGeneratorForm";
import MedicalSpecialtySelect from "@/components/MedicalSpecialtySelect";
import type { SNSData } from '@/types/api';

export default function SNSPage() {
  const [formData, setFormData] = useState<SNSData>({
    snsType: "인스타그램",
    content: "",
    additional: "",
    medicalSpecialty: undefined
  });

  const fields = (
    <>
      <div>
        <label className="block text-sm text-white font-bold mb-3">
          SNS 종류 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={formData.snsType}
            onChange={(e) => setFormData({ ...formData, snsType: e.target.value as SNSData['snsType'] })}
            className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold focus:border-gray-700 focus:outline-none appearance-none cursor-pointer text-sm pr-10"
          >
            <option value="인스타그램">인스타그램</option>
            <option value="틱톡/숏츠">틱톡/숏츠</option>
            <option value="X (트위터)">X (트위터)</option>
            <option value="쓰레드">쓰레드</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <MedicalSpecialtySelect
        value={formData.medicalSpecialty}
        onChange={(value) => setFormData({ ...formData, medicalSpecialty: value })}
      />

      <div>
        <label className="block text-sm text-white font-bold mb-3">
          컨텐츠 내용 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none resize-none text-sm"
          rows={5}
          placeholder="게시할 컨텐츠와 시술 내용을 간략하게 작성해 주세요."
        />
      </div>

      <div>
        <label className="block text-sm text-white font-bold mb-3">
          기타
        </label>
        <textarea
          value={formData.additional}
          onChange={(e) => setFormData({ ...formData, additional: e.target.value })}
          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none resize-none text-sm"
          rows={5}
          placeholder="참고해야할 요청사항을 작성해 주세요."
        />
      </div>
    </>
  );

  return (
    <ContentGeneratorForm
      type="sns"
      title="SNS 게시물"
      fields={fields}
      formData={formData}
      onFormDataChange={setFormData}
    />
  );
}
