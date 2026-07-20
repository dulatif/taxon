'use client';

import React, { Children, isValidElement, PropsWithChildren, ReactNode } from 'react';

// # entity
interface IRenderProps extends PropsWithChildren {
  in: boolean;
  then?: ReactNode;
  fallback?: ReactNode;
}

interface IWhenProps {
  in: boolean;
  then: ReactNode;
  otherwise: ReactNode;
}

/**
 * Basic Render component
 * Usage: <Render in={condition} fallback={<Else />}> <Then /> </Render>
 * Usage (One-liner): <Render in={condition} then="Show me" fallback="Hide me" />
 */
const RenderComponent: React.FC<IRenderProps> = (props) => {
  if (props.in) return <>{props.then ?? props.children}</>;
  return <>{props.fallback}</>;
};

/**
 * Render.If component that supports nested Render.Else
 * Usage:
 * <Render.If in={condition}>
 *   <Then />
 *   <Render.Else> <Else /> </Render.Else>
 * </Render.If>
 */
const If: React.FC<IRenderProps> = ({ in: condition, children }) => {
  const childrenArray = Children.toArray(children);

  const elseChild = childrenArray.find(
    (child) => isValidElement(child) && (child.type === Else || (child.type as any).displayName === 'Render.Else')
  );

  const thenChildren = childrenArray.filter((child) => child !== elseChild);

  if (condition) return <>{thenChildren}</>;
  return <>{elseChild}</>;
};

const Else: React.FC<PropsWithChildren> = ({ children }) => <>{children}</>;
Else.displayName = 'Render.Else';

/**
 * Render.When for one-liner conditional values (Ternary replacement)
 * Usage: <Render.When in={isSaving} then="Saving..." otherwise="Save Changes" />
 */
const When: React.FC<IWhenProps> = ({ in: condition, then, otherwise }) => {
  return condition ? <>{then}</> : <>{otherwise}</>;
};
When.displayName = 'Render.When';

// # logic
const Render = Object.assign(RenderComponent, {
  If,
  Else,
  When,
  // Cases for the user's specific request
  IF: If,
  ELSE: Else,
  WHEN: When,
});

export default Render;
