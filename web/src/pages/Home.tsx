import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-bold text-green-800 mb-4">
          FarmTrace
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Map your land, plan your crops, and collaborate with agronomists — all from one place.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            to="/signup"
            className="rounded-lg bg-green-600 px-6 py-3 text-white font-medium transition hover:bg-green-700"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-green-600 px-6 py-3 text-green-600 font-medium transition hover:bg-green-50"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl mb-2">🗺️</div>
            <h3 className="font-semibold text-gray-700">Map Your Farm</h3>
            <p className="text-sm text-gray-500 mt-1">Walk the perimeter or draw boundaries on a map</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🌱</div>
            <h3 className="font-semibold text-gray-700">Plan Your Crops</h3>
            <p className="text-sm text-gray-500 mt-1">Drag-and-drop planting zones with smart presets</p>
          </div>
          <div>
            <div className="text-3xl mb-2">👨‍🌾</div>
            <h3 className="font-semibold text-gray-700">Collaborate</h3>
            <p className="text-sm text-gray-500 mt-1">Work with agronomists on your farm plans</p>
          </div>
        </div>
      </div>
    </div>
  );
}
