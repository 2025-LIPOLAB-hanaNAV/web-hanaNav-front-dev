import * as React from "react";
import type { SVGProps } from "react";
import {
  Timer, ArrowRight, Search, FileText, BookOpen, Mic, MicOff,
  Shield, AlertTriangle, CheckCircle, HelpCircle, Info, Star,
  Bookmark, Pin, Calendar, Share2, Link2, Upload, Download, Copy,
  Filter, Settings, Home, ShieldCheck, PiggyBank, CreditCard, Coins,
  Route, Users, Navigation
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
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "width" | "height">;

export function Icon({ name, size = 16, strokeWidth = 1.5, className, ...rest }: Props) {
  const Cmp = ICONS[name] ?? HelpCircle;
  return <Cmp width={size} height={size} strokeWidth={strokeWidth} className={className} aria-hidden {...rest} />;
}
export default Icon;