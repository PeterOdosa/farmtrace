import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFarms, signOut } from '../services/api';
import { getSession } from '../services/api';

interface Farm {
  id: string;
  name: string;
  crop_type: string | null;
  area_hectares: number | null;
  perimeter_km: number | null;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const session = await getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setEmail(session.user.email || null);
      await loadFarms();
    } catch (err) {
      navigate('/login');
    }
  };

  const loadFarms = async () => {
    try {
      const farmsData = await getFarms();
      setFarms(farmsData);
    } catch (err) {
      console.error('Failed to load farms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-green-800">FarmTrace</h1>
              <nav className="hidden md:flex gap-6">
                <Link to="/dashboard" className="text-green-600 font-medium">Dashboard</Link>
                <Link to="/farm/new" className="text-gray-600 hover:text-green-600 transition">New Farm</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {email}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Farms</h2>
            <p className="text-gray-500 mt-1">{farms.length} farm{farms.length !== 1 ? 's' : ''} mapped</p>
          </div>
          <Link
            to="/farm/new"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition shadow-sm"
          >
            <span>+</span> Add Farm
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading farms...</p>
            </div>
          </div>
        ) : farms.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm border border-gray-200">
            <div className="text-6xl mb-4">🌾</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No farms yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Use the FarmTrace mobile app to map your land boundaries, or import a polygon file to get started.
            </p>
            <Link
              to="/farm/new"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
            >
              Create Your First Farm
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {farms.map((farm) => (
              <Link
                key={farm.id}
                to={`/farm/${farm.id}`}
                className="group block rounded-lg bg-white p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-xl">
                    🌱
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(farm.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition">
                  {farm.name}
                </h3>
                <div className="mt-3 space-y-1">
                  {farm.crop_type && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Crop:</span> {farm.crop_type}
                    </p>
                  )}
                  {farm.area_hectares && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Area:</span> {Number(farm.area_hectares).toFixed(2)} ha
                    </p>
                  )}
                  {farm.perimeter_km && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Perimeter:</span> {Number(farm.perimeter_km).toFixed(2)} km
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
