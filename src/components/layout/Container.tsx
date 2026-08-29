interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`layout-content ds-page-gutter ${className}`}
    >
      {children}
    </div>
  );
}
