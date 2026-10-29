import { Anchor as Link } from "./anchor";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "../ui/icon";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  readonly children: ReactNode;
  readonly href?: undefined;
  readonly icon?: IconName;
  readonly iconRight?: IconName;
  readonly variant?: "primary" | "secondary" | "ghost" | "soft";
  readonly size?: "sm" | "md" | "lg";
};

export type ButtonLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & {
  readonly children: ReactNode;
  readonly href: string;
  readonly icon?: IconName;
  readonly iconRight?: IconName;
  readonly variant?: "primary" | "secondary" | "ghost" | "soft";
  readonly size?: "sm" | "md" | "lg";
};

export function Button(props: ButtonProps | ButtonLinkProps) {
  const {
  children,
  href,
  icon,
  iconRight,
  variant = "primary",
  size = "md",
  className,
  } = props;
  const content = (
    <>
      {icon ? <Icon name={icon} size={size === "lg" ? 18 : 16} /> : null}
      <span>{children}</span>
      {iconRight ? <Icon name={iconRight} size={size === "lg" ? 18 : 16} /> : null}
    </>
  );
  const classes = `btn btn-${variant} btn-${size}${className ? ` ${className}` : ""}`;
  if (!href) {
    const buttonProps = nativeProps(props) as ButtonHTMLAttributes<HTMLButtonElement>;
    return <button {...buttonProps} className={classes} type={buttonProps.type ?? "button"}>{content}</button>;
  }
  const linkHref = href;
  const anchorProps = nativeProps(props) as AnchorHTMLAttributes<HTMLAnchorElement>;
  if (/^(?:https?:|mailto:)/u.test(href)) {
    const target = anchorProps.target ?? (href.startsWith("mailto:") ? undefined : "_blank");
    const rel = target === "_blank" ? anchorProps.rel ?? "noreferrer" : anchorProps.rel;
    return <a {...anchorProps} className={classes} href={linkHref} rel={rel} target={target}>{content}</a>;
  }
  if (href.startsWith("/api/")) {
    return <a {...anchorProps} className={classes} href={linkHref}>{content}</a>;
  }
  const nextLinkProps = anchorProps as unknown as Omit<ComponentProps<typeof Link>, "children" | "className" | "href">;
  return <Link {...nextLinkProps} className={classes} href={linkHref}>{content}</Link>;
}

function nativeProps(props: ButtonProps | ButtonLinkProps): Record<string, unknown> {
  const native = { ...props } as Record<string, unknown>;
  for (const key of ["children", "className", "href", "icon", "iconRight", "size", "variant"]) {
    delete native[key];
  }
  return native;
}
