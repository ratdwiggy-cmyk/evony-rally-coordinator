import type { ReactNode } from 'react';

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      // tabIndex -1 lets the skip-link (Header) move keyboard focus here on
      // click without adding this landmark to the normal Tab order.
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-10 focus:outline-none"
    >
      {children}
    </main>
  );
}
