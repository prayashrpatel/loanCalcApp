// src/components/Card.tsx
import type { PropsWithChildren, ReactNode } from "react";

type CardProps = PropsWithChildren<{
  title?: string;
  right?: ReactNode;
  className?: string;
}>;

export default function Card({ title, right, className, children }: CardProps) {
  return (
    <div className={`panel ${className ?? ""}`}>
      {(title || right) && (
        <div className="panel-head">
          {title ? <h3 className="panel-title">{title}</h3> : <span />}
          {right ? <div className="panel-right">{right}</div> : null}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  );
}
