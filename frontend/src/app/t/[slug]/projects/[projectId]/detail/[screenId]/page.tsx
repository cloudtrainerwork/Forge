'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { getById as getProjectById } from '@/services/ProjectService';

const ForgeDetailView = dynamic(
  () => import('@/components/ForgeDetailViewEnhanced'),
  { ssr: false },
);

export default function DetailPage() {
  const params = useParams();
  const screenId = params.screenId as string;
  const projectId = params.projectId as string;
  const { setProjectContext, clearProjectContext } = useCanvasStore();

  const screenName = screenId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Load the real project name and set breadcrumb context
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const project = await getProjectById(projectId);
        if (!cancelled) {
          setProjectContext(projectId, project?.name || screenName);
        }
      } catch {
        if (!cancelled) {
          setProjectContext(projectId, screenName);
        }
      }
    })();
    return () => {
      cancelled = true;
      clearProjectContext();
    };
  }, [projectId, screenName]);

  return (
    <div className="h-full relative">
      <ForgeDetailView screenId={screenId} screenName={screenName} />
    </div>
  );
}
