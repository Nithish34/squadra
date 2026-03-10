"use client";

import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "className">, LinkProps {
  className?: string | ((props: { isActive: boolean; isPending: boolean }) => string);
  activeClassName?: string;
  pendingClassName?: string;
  to?: string; // For react-router-dom copy-paste compatibility
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, href, to, ...props }, ref) => {
    const pathname = usePathname();
    const finalHref = href || to || "#";
    const isActive = pathname === finalHref || pathname?.startsWith(String(finalHref) + "/");

    let resolvedClassName = typeof className === "function"
      ? className({ isActive, isPending: false })
      : className;

    return (
      <Link
        ref={ref}
        href={finalHref}
        className={cn(resolvedClassName, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
