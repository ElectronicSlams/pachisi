/** Optional adapter: import only in Next.js consumers. No Next dependency in the core. */
import NextLink from "next/link";
import { Button as BrowserButton, type ButtonProps, type ButtonLinkProps } from "./ui/button";
import { Icon } from "./game/ui-icons";
export function Button(props: ButtonProps | ButtonLinkProps) {
  if (!props.href || /^(?:https?:|mailto:)/u.test(props.href) || props.href.startsWith("/api/")) return <BrowserButton {...props} />;
  const { href, icon, iconRight, variant = "primary", size = "md", className, children, ...anchor } = props;
  return <NextLink {...anchor} href={href} prefetch={false} className={`btn btn-${variant} btn-${size}${className ? ` ${className}` : ""}`}>{icon ? <Icon name={icon} size={size === "lg" ? 18 : 16} /> : null}<span>{children}</span>{iconRight ? <Icon name={iconRight} size={size === "lg" ? 18 : 16} /> : null}</NextLink>;
}
