import { Suspense } from 'react';

import { AppShell } from '@views/components/AppShell';
import { PhonicsPracticePage } from '@views/features/PhonicsPracticePage';

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<p style={{ padding: 24, color: '#4a5568' }}>Loading phonics…</p>}>
        <PhonicsPracticePage />
      </Suspense>
    </AppShell>
  );
}
