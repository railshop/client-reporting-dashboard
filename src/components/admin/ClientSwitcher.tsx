import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

interface ClientOption {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

export function ClientSwitcher({ activeSlug }: { activeSlug: string | undefined }) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientOption[]>([]);

  useEffect(() => {
    apiFetch<{ clients: ClientOption[] }>('/clients-list')
      .then((d) => setClients(d.clients))
      .catch(() => {});
  }, []);

  const activeClient = clients.find((c) => c.slug === activeSlug);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <span className="text-xs font-bold">
                {activeClient ? activeClient.name.charAt(0) : 'R'}
              </span>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {activeClient?.name ?? 'Select Client'}
              </span>
              {activeClient && (
                <span className="truncate text-xs text-muted-foreground">
                  {activeClient.active ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Clients
              </DropdownMenuLabel>
              {clients.map((client) => (
                <DropdownMenuItem
                  key={client.slug}
                  onClick={() => navigate(`/admin/clients/${client.slug}/profile`)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <span className="text-[10px] font-bold">{client.name.charAt(0)}</span>
                  </div>
                  <span className="flex-1">{client.name}</span>
                  {client.slug === activeSlug && (
                    <span className="size-2 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2 text-muted-foreground">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <span>Add Client</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
