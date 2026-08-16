'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/utils/api';

export default function AdminGuard({ children }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const user = await getCurrentUser();

      if (!user || user.role !== 'admin') {
        router.replace('/rooms');
        return;
      }

      if (!cancelled) setChecked(true);
    };

    check();
    return () => { cancelled = true; };
  }, [router]);

  if (!checked) return null;

  return children;
}
