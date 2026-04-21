import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/');
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-accent/10 overflow-hidden">
      {/* Ambient background mesh */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-yellow-500/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/3 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-emerald-500/2 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
