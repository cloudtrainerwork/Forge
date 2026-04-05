'use client';

/**
 * Project canvas page — loads ForgeGraphReactFlow scoped to a specific project.
 */

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const ForgeGraphReactFlow = dynamic(
  () => import('../../../../../components/ForgeGraphReactFlow'),
  { ssr: false },
);

export default function ProjectCanvasPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <ForgeGraphReactFlow projectId={projectId} />;
}
