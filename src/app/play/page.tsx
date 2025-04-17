'use client';

import React, { Suspense } from 'react';
import PlayArea from '@/components/PlayArea';

export default function PlayPage() {
  return (
    <Suspense fallback={<LoadingFallback />}> 
      <PlayArea />
    </Suspense>
  );
}

// Simple fallback component
function LoadingFallback() {
  // You can style this better or use a spinner component
  return <p className="text-center mt-10">Loading game...</p>;
} 