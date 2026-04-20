import { Suspense } from 'react';

import AuthPage from '@views/auth/AuthPage';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}
