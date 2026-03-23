declare module 'react' {
  export type ReactNode = any;
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type Dispatch<A> = (value: A) => void;

  export interface FC<P = {}> {
    (props: P): JSX.Element | null;
  }

  export interface ErrorInfo {
    componentStack: string | null;
    digest?: string;
  }

  export class Component<P = {}, S = {}> {
    constructor(props: P);
    props: Readonly<P>;
    state: Readonly<S>;
    setState(state: Partial<S> | ((prevState: S, props: P) => Partial<S>)): void;
    render(): ReactNode;
    static getDerivedStateFromError?(error: Error): any;
    componentDidCatch?(error: Error, info: ErrorInfo): void;
  }

  export interface MutableRefObject<T> {
    current: T;
  }

  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  export interface FormEvent<T = Element> {
    preventDefault(): void;
    currentTarget: T;
    target: EventTarget & T;
  }

  export interface ChangeEvent<T = Element> extends FormEvent<T> {}

  export interface MouseEvent<T = Element> {
    stopPropagation(): void;
    preventDefault(): void;
    currentTarget: T;
    target: EventTarget & T;
  }

  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useDeferredValue<T>(value: T): T;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function startTransition(scope: () => void): void;
  export function memo<P extends object>(component: (props: P) => JSX.Element | null): (props: P) => JSX.Element | null;
  export function lazy<T extends object>(factory: () => Promise<{ default: (props: T) => JSX.Element | null }>): (props: T) => JSX.Element | null;
  export const Suspense: FC<{ children?: ReactNode; fallback?: ReactNode }>;

  const React: {
    StrictMode: FC<{ children?: ReactNode }>;
  };

  export default React;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): JSX.Element;
  export function jsxs(type: any, props: any, key?: any): JSX.Element;
  export const Fragment: unique symbol;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: any): void;
  };
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}
