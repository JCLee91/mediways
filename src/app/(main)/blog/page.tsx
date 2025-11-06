"use client";

import { useState } from "react";
import ContentGeneratorForm from "@/components/ContentGeneratorForm";
import MedicalSpecialtySelect from "@/components/MedicalSpecialtySelect";
import type { BlogData } from '@/types/api';

export default function BlogPage() {
  const [activeTab, setActiveTab] = useState<"review" | "info">("review");
  const [formData, setFormData] = useState<BlogData>({
    topic: "",
    tone: "~해요체",
    toneExample: "",
    content: "",
    medicalSpecialty: undefined
  });

  const fields = (
    <>
      {/* Tab buttons */}
      <div className="flex flex-col gap-3 mb-8">
        <button
          onClick={() => setActiveTab("review")}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "review"
              ? "bg-[#4f84f5] text-white"
              : "border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
          }`}
        >
          리뷰형
        </button>
        <button
          onClick={() => setActiveTab("info")}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "info"
              ? "bg-[#4f84f5] text-white"
              : "border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
          }`}
        >
          정보형
        </button>
      </div>

      <MedicalSpecialtySelect
        value={formData.medicalSpecialty}
        onChange={(value) => setFormData({ ...formData, medicalSpecialty: value })}
      />

      <div>
        <label className="block text-sm text-white font-bold mb-3">
          게시물 주제 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.topic}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none resize-none text-sm"
          rows={3}
          placeholder="후기, 리뷰 등의 주제를 입력해 주세요"
        />
      </div>

      <div>
        <label className="block text-sm text-white font-bold mb-3">
          말투 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select 
            value={formData.tone}
            onChange={(e) => setFormData({ ...formData, tone: e.target.value as BlogData['tone'] })}
            className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold focus:border-gray-700 focus:outline-none appearance-none cursor-pointer text-sm pr-10"
          >
            <option value="~해요체">~해요체</option>
            <option value="~습니다체">~습니다체</option>
            <option value="반말">반말</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-white font-bold mb-3">
          말투 예시 문장
        </label>
        <textarea
          value={formData.toneExample}
          onChange={(e) => setFormData({ ...formData, toneExample: e.target.value })}
          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none resize-none text-sm"
          rows={4}
          placeholder="내 말투가 표현된 예시 문장을 입력해주세요."
        />
      </div>

      <div>
        <label className="block text-sm text-white font-bold mb-3">
          핵심 내용 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none resize-none text-sm"
          rows={6}
          placeholder="꼭 포함되어야 하는 제품이나 시술 내용을 입력해주세요."
        />
      </div>
    </>
  );

  return (
    <ContentGeneratorForm
      type="blog"
      title="블로그"
      fields={fields}
      formData={formData}
      onFormDataChange={setFormData}
      subType={activeTab}
    />
  );
}