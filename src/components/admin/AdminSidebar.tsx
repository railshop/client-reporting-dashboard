import { useParams, useLocation, Link } from 'react-router-dom';
import {
  UserCircle,
  Plug,
  Users,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ClientSwitcher } from './ClientSwitcher';
import { UserMenu } from './UserMenu';

export function AdminSidebar() {
  const { clientSlug } = useParams();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <img src="/railshop.svg" alt="Railshop" className="h-4 brightness-0 invert" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Admin</span>
        </div>
        <ClientSwitcher activeSlug={clientSlug} />
      </SidebarHeader>

      <SidebarContent>
        {clientSlug && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link to={`/admin/clients/${clientSlug}/profile`} />}
                    isActive={isActive(`/admin/clients/${clientSlug}/profile`)}
                  >
                    <UserCircle className="size-4" />
                    <span>Profile</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link to={`/admin/clients/${clientSlug}/integrations`} />}
                    isActive={isActive(`/admin/clients/${clientSlug}/integrations`)}
                  >
                    <Plug className="size-4" />
                    <span>Integrations</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link to={`/admin/clients/${clientSlug}/users`} />}
                    isActive={isActive(`/admin/clients/${clientSlug}/users`)}
                  >
                    <Users className="size-4" />
                    <span>Users</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link to={`/admin/clients/${clientSlug}/reports`} />}
                    isActive={location.pathname.startsWith(`/admin/clients/${clientSlug}/reports`)}
                  >
                    <FileText className="size-4" />
                    <span>Reports</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<a href={`/${clientSlug}`} target="_blank" rel="noopener noreferrer" />}
                  >
                    <ExternalLink className="size-4" />
                    <span>View As Client</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
