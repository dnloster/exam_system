import { cn } from "./cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
};

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn("card", padding && "card-padded", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("card-header", className)}>{children}</div>;
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("card-body", className)}>{children}</div>;
}
