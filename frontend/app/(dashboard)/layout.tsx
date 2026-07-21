'use client';

import { Button } from '@/components/ui/button';
import { getMe, getMeQueryKey, logout } from '@/lib/api/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Store as StoreIcon, ClipboardList, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { title: 'Purchase Report', url: '/purchase-report', icon: ClipboardList },
  { title: 'Labour Cost', url: '/labour-cost', icon: Users },
  { title: 'Store', url: '/store', icon: StoreIcon },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: getMeQueryKey(),
    queryFn: getMe,
    retry: false,
  });

  const { mutate: doLogout } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (isError || !data) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col justify-between border-r bg-card p-4">
        <div className="flex flex-col gap-1">
          <div className="mb-4 px-2 text-lg font-semibold">Purchase Tracker</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.url);
            return (
              <Link
                key={item.url}
                href={item.url}
                className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
                  isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 px-2">
          <span className="text-xs text-muted-foreground">Logged in as {data.data.username}</span>
          <Button variant="outline" size="sm" onClick={() => doLogout()}>
            <LogOut className="mr-1 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
};

export default DashboardLayout;
