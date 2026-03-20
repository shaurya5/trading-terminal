import Link from 'next/link';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#0a0e17] text-gray-300 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-white mb-8">Disclaimer</h1>

        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            This application displays market data from Yahoo Finance for
            informational and educational purposes only.
          </p>
          <p>
            Data may be delayed up to 15-20 minutes and may not reflect
            real-time market conditions.
          </p>
          <p>
            This is not financial advice. Do not make trading or investment
            decisions based solely on data shown here.
          </p>
          <p>The developers are not responsible for any financial losses incurred.</p>
          <p>
            Yahoo Finance is a trademark of Yahoo Inc. This application is not
            affiliated with or endorsed by Yahoo Inc.
          </p>
          <p>
            For real-time data, please consult your broker or a licensed data
            provider.
          </p>
        </div>

        <div className="mt-10">
          <Link
            href="/"
            className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
          >
            &larr; Back to Terminal
          </Link>
        </div>
      </div>
    </div>
  );
}
