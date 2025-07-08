'use client';

import React, { Suspense } from 'react';
import AuthCallbackContent from './AuthCallbackContent';

export default function AuthCallback() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
