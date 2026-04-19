import { Suspense } from 'react';

import HomePage from '@views/home/HomePage';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}
