import * as React from "react";
import type { SVGProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../ui/utils";
import {
  Timer, ArrowRight, Search, FileText, BookOpen, Mic, MicOff,
  Shield, AlertTriangle, CheckCircle, HelpCircle, Info, Star,
  Bookmark, Pin, Calendar, Share2, Link2, Upload, Download, Copy,
  Filter, Settings, Home, ShieldCheck, PiggyBank, CreditCard, Coins,
  Route, Users, Navigation, Loader2, RefreshCw, Database, MapPin,
  BookmarkCheck, MoreHorizontal, ExternalLink, Eye, Clock, X,
  ShieldAlert, ChevronLeft, ChevronRight, Menu
} from "lucide-react";

const ICONS = {
  "timer": Timer,
  "arrow-right": ArrowRight,
  "search": Search,
  "file-text": FileText,
  "book-open": BookOpen,
  "mic": Mic,
  "mic-off": MicOff,
  "shield": Shield,
  "alert-triangle": AlertTriangle,
  "check-circle": CheckCircle,
  "help-circle": HelpCircle,
  "info": Info,
  "star": Star,
  "bookmark": Bookmark,
  "pin": Pin,
  "calendar": Calendar,
  "share-2": Share2,
  "link-2": Link2,
  "upload": Upload,
  "download": Download,
  "copy": Copy,
  "filter": Filter,
  "settings": Settings,
  "home": Home,
  "shield-check": ShieldCheck,
  "piggy-bank": PiggyBank,
  "credit-card": CreditCard,
  "coins": Coins,
  "route": Route,
  "users": Users,
  "navigation": Navigation,
  "loader": Loader2,
  "refresh-cw": RefreshCw,
  "database": Database,
  "map-pin": MapPin,
  "bookmark-check": BookmarkCheck,
  "more-horizontal": MoreHorizontal,
  "external-link": ExternalLink,
  "eye": Eye,
  "clock": Clock,
  "x": X,
  "shield-alert": ShieldAlert,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "menu": Menu,
} as const;

export type IconName = keyof typeof ICONS;

const iconVariants = cva("flex-shrink-0", {
  variants: {
    size: {
      xs: "w-3 h-3",
      sm: "w-4 h-4", 
      md: "w-5 h-5",
      lg: "w-6 h-6",
      xl: "w-8 h-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height">, VariantProps<typeof iconVariants> {
  name: IconName;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  spinning?: boolean;
}

export function Icon({ name, size = "md", spinning = false, className, ...rest }: IconProps) {
  const IconComponent = ICONS[name] ?? HelpCircle;
  const sizeNumber = typeof size === "number" ? size : undefined;
  
  return (
    <IconComponent 
      className={cn(
        typeof size === "string" ? iconVariants({ size }) : "",
        spinning && "animate-spin",
        className
      )}
      width={sizeNumber}
      height={sizeNumber}
      aria-hidden="true"
      {...rest}
    />
  );
}