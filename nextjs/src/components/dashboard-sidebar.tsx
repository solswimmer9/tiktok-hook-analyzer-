import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { appConfig } from "@/config/app";
import { useUser } from "@/hooks/useUser";
import {
  ChevronUp,
  Search,
  Video,
  Brain,
  TrendingUp,
  Settings,
  LayoutDashboard
} from "lucide-react";
import { useRouter } from "next/router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const items = appConfig.dashboard.navigation;

const iconMap: Record<string, any> = {
  Search,
  Video,
  Brain,
  TrendingUp,
  Settings,
  LayoutDashboard
};

export default function DashboardSidebar() {
  const { user, signOut } = useUser();

  const router = useRouter();
  const truncate = (email: string) => {
    return email.length > 20 ? email.substring(0, 20) + "..." : email;
  };

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <p
              onClick={() => router.push("/dashboard")}
              className="text-foreground-muted cursor-pointer px-2 pt-2 text-2xl font-bold"
            >
              {appConfig.brand.name}
            </p>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      {/* Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = (item as any).icon ? iconMap[(item as any).icon] : null;

                return (
                  <SidebarMenuItem key={item.title}>
                    {'subItems' in item ? (
                      <Collapsible
                        defaultOpen
                        className="group/collapsible w-full"
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="px-4 py-3">
                            {Icon && <Icon className="mr-2 h-4 w-4" />}
                            <span>{item.title}</span>
                            <ChevronUp className="ml-auto h-6 w-6 transition-transform group-data-[state=closed]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => {
                              const SubIcon = (subItem as any).icon ? iconMap[(subItem as any).icon] : null;
                              return (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild>
                                    <a href={subItem.url} className="px-6 py-3 flex items-center">
                                      {SubIcon && <SubIcon className="mr-2 h-4 w-4" />}
                                      {subItem.title}
                                    </a>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : 'url' in item ? (
                      <SidebarMenuButton asChild>
                        <a href={item.url} className="px-4 py-3">
                          {Icon && <Icon className="mr-2 h-4 w-4" />}
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="px-4 py-3">
                  {user?.email ? truncate(user.email) : "Account"}
                  <ChevronUp className="ml-auto h-6 w-6" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem onClick={signOut}>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
