import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Truck, Users, Fuel, Wrench,
  CircleDot, ClipboardCheck, AlertTriangle,
  FileBarChart, Settings,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const operacao = [
  { title: "Dashboard",    url: "/dashboard",    icon: LayoutDashboard },
  { title: "Frota",        url: "/frota",        icon: Truck },
  { title: "Motoristas",   url: "/motoristas",   icon: Users },
  { title: "Abastecimento",url: "/abastecimento",icon: Fuel },
  { title: "Manutenção",   url: "/manutencao",   icon: Wrench },
  { title: "Pneus",        url: "/pneus",        icon: CircleDot },
  { title: "Checklist",    url: "/checklist",    icon: ClipboardCheck },
  { title: "Ocorrências",  url: "/ocorrencias",  icon: AlertTriangle },
];

const gestao = [
  { title: "Relatórios",    url: "/relatorios",   icon: FileBarChart },
  { title: "Configurações", url: "/configuracoes",icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border/50 py-3">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-1">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/25">
            <Truck className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-semibold text-sm text-sidebar-foreground">FrotaPro</span>
              <span className="text-[10px] text-sidebar-foreground/40 font-normal">Gestão de frotas</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {/* Operação */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/30 px-3 mb-1">
              Operação
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {operacao.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-8 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-primary/15 data-[active=true]:text-primary transition-all"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Divisor */}
        <div className="mx-3 my-2 h-px bg-sidebar-border/50" />

        {/* Gestão */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/30 px-3 mb-1">
              Gestão
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {gestao.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-8 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-primary/15 data-[active=true]:text-primary transition-all"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
