"use client";

import { useState } from "react";
import ContentGeneratorForm from "@/components/ContentGeneratorForm";
import MedicalSpecialtySelect from "@/components/MedicalSpecialtySelect";
import type { CopywritingData } from '@/types/api';

export default function CopywritingPage() {
  const [activeTab, setActiveTab] = useState<"korean" | "english">("korean");
  const [formData, setFormData] = useState<CopywritingData>({
    language: "korean",
    productIntro: "",
    emphasize: "",
    charCount: "",
    medicalSpecialty: undefined
  });

  const fields = (
    <>
      {/* Language tabs */}
      <div className="flex flex-col gap-3 mb-8">
        <button
          onClick={() => {
            setActiveTab("korean");
            setFormData({ ...formData, language: "korean" });
          }}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "korean"
              ? "bg-[#4f84f5] text-white"
              : "border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
          }`}
        >
          한국어
        </button>
        <button
          onClick={() => {
            setActiveTab("english");
            setFormData({ ...formData, language: "english" });
          }}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "english"
              ? "bg-[#4f84f5] text-white"
              : "border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
          }`}
        >
          영어
        </button>
      </div>

      <MedicalSpecialtySelect
        value={formData.medicalSpecialty}
        onChange={(value) => setFormData({ ...formData, medicalSpecialty: value })}
      />

      <div>
        <label className="block text-sm text-white font-bold mb-3">
          제품 소개 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.productIntro}
          onChange={(e) => setFormData({ ...formData, productIntro: e.target.value })}
          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none resize-none text-sm"
          rows={3}
          placeholder="시술이나 제품의 소개를 한 줄로 작성해 주세요."
        />
      </div>

      <div>
        <label className="block text-sm text-white font-bold mb-3">
          강조하고 싶은 메세지 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.emphasize}
          onChange={(e) => setFormData({ ...formData, emphasize: e.target.value })}
          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none resize-none text-sm"
          rows={3}
          placeholder="강조하고 싶은 메세지를 입력하세요."
        />
      </div>

      <div>
        <label className="block text-sm text-white font-bold mb-3">
          최대 글자 수 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.charCount}
          onChange={(e) => setFormData({ ...formData, charCount: e.target.value })}
          className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:border-gray-700 focus:outline-none text-sm"
          placeholder="공백 포함 최소 10자 ~ 100자까지"
        />
      </div>
    </>
  );

  return (
    <ContentGeneratorForm
      type="copywriting"
      title="카피라이팅"
      fields={fields}
      formData={formData}
      onFormDataChange={setFormData}
      subType={activeTab}
    />
  );
}


