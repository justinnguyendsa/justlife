import { useEffect, useState } from 'react';
import { migrateFromLocalStorage } from '../db';

export default function DataMigrator({ children }: { children: React.ReactNode }) {
  const [migrating, setMigrating] = useState(true);

  useEffect(() => {
    migrateFromLocalStorage().then(() => {
      setMigrating(false);
    });
  }, []);

  if (migrating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="font-medium animate-pulse">Đang cập nhật Cơ sở dữ liệu... Vui lòng chờ lát nhé!</p>
        <p className="text-sm text-slate-500 mt-2">Nâng cấp sang IndexedDB để chuẩn bị cho version Super App</p>
      </div>
    );
  }

  return <>{children}</>;
}
