import Spinner from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f13] px-4">
      <div className="text-center space-y-4">
        <Spinner />
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    </div>
  );
}


