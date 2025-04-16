'use client';

import { SignUp } from '@clerk/nextjs';
import React from 'react';

export default function SignUpPage() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"> {/* Adjust min-height based on header/footer */}
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </div>
  );
} 