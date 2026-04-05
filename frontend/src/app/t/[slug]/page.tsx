'use client';

/**
 * Tenant home page — redirects to the project browser.
 */

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function TenantHomePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    router.replace(`/t/${slug}/projects`);
  }, [router, slug]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#6d7196',
    }}>
      Redirecting to projects...
    </div>
  );
}
