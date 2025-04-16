'use client';

import { SignIn } from '@clerk/nextjs';
import React from 'react';

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"> {/* Adjust min-height based on header/footer */}
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </div>
  );
} 