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
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-green-800">FarmTrace</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Farms</h2>
          <Link
            to="/farm/new"
            className="rounded bg-green-600 px-4 py-2 text-sm text-white transition hover:bg-green-700"
          >
            + Add Farm
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading farms...</p>
        ) : farms.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-500">No farms yet.</p>
            <p className="mt-2 text-sm text-gray-400">
              Use the mobile app to map your land, or import a polygon file.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {farms.map((farm) => (
              <div key={farm.id} className="rounded-lg bg-white p-6 shadow">
                <h3 className="font-semibold">{farm.name}</h3>
                {farm.crop_type && (
                  <p className="mt-1 text-sm text-gray-500">Crop: {farm.crop_type}</p>
                )}
                {farm.area_hectares && (
                  <p className="mt-1 text-sm text-gray-500">
                    Area: {Number(farm.area_hectares).toFixed(2)} ha
                  </p>
                )}
                <p className="mt-3 text-xs text-gray-400">
                  Updated: {new Date(farm.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
