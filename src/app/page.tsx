'use client';

import dynamic from 'next/dynamic';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0a0e17] text-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-sm text-gray-400">Loading market data...</div>
      </div>
    </div>
  );
}

const Terminal = dynamic(() => import('@/components/Terminal'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function Home() {
  return <Terminal />;
}
