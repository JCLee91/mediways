export default function Spinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-2 border-gray-700 rounded-full"></div>
        <div className="absolute inset-0 border-2 border-[#4f84f5] rounded-full animate-spin border-t-transparent"></div>
      </div>
    </div>
  );
}