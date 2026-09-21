import React from 'react';
import { notFound } from 'next/navigation';
import { fetchClusterById } from '@/lib/api';
import { ClusterDetail } from '@/components/cluster/ClusterDetail';

interface ClusterPageProps {
  params: {
    id: string;
  };
}

export default async function ClusterPage({ params }: ClusterPageProps) {
  try {
    const cluster = await fetchClusterById(params.id);
    if (!cluster) {
      notFound();
    }
    return <ClusterDetail cluster={cluster} />;
  } catch (err) {
    notFound();
  }
}
