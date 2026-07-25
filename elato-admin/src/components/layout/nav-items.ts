import type { ComponentType } from "react";
import {
  LayoutDashboard,
  BarChart3,
  FolderTree,
  UtensilsCrossed,
  Sparkles,
  Cake,
  PartyPopper,
  BedDouble,
  FileText,
  Settings as SettingsIcon,
  Users,
  Gift,
  ClipboardList,
  Film,
} from "lucide-react";
import type { AdminRole } from "../../types/api";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles?: AdminRole[];
  section: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, section: "Overview" },

  { to: "/homepage", label: "Homepage", icon: FileText, section: "Content" },
  { to: "/video-gallery", label: "Video Showcase", icon: Film, section: "Content" },
  { to: "/specials", label: "Specials", icon: Sparkles, section: "Content" },
  { to: "/categories", label: "Categories", icon: FolderTree, section: "Content" },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed, section: "Content" },
  { to: "/celebre", label: "Celebré", icon: Cake, section: "Content" },
  { to: "/stay", label: "Stay", icon: BedDouble, section: "Content" },
  { to: "/events", label: "Events", icon: PartyPopper, section: "Content" },

  { to: "/offers", label: "Offers", icon: Gift, section: "Marketing" },
  { to: "/offer-registrations", label: "Offer Registrations", icon: ClipboardList, section: "Marketing" },

  { to: "/settings", label: "Settings", icon: SettingsIcon, roles: ["owner", "admin"], section: "Administration" },
  { to: "/users", label: "Users", icon: Users, roles: ["owner", "admin"], section: "Administration" },
];
