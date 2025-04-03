import type { JSX } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

export function useInfiniteScroll() {
  const [observer, setObserver] = useState<IntersectionObserver>();

  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [containerNode, setContainerNode] = useState<HTMLElement | null>();

  const [shouldLoadMore, setShouldLoadMore] = useState(false);

  const setScrollContainerRef = useCallback((node: HTMLElement | null) => {
    setContainerNode(node);
    scrollContainerRef.current = node;
  }, []);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (!containerNode) return;

    // setup observer
    const observer = new IntersectionObserver(
      (entries) => {
        setShouldLoadMore(entries.some((entry) => entry.intersectionRatio > 0) ? true : false);
      },
      {
        root: containerNode,
        rootMargin: "0px 0px 150% 0px", // load 1.5 more screens beyond visible area
        threshold: 0.01,
      }
    );

    setObserver(observer);

    return () => {
      // cleanup observer
      observer.disconnect();
    };
  }, [containerNode]);

  const InfiniteScrollBottom = useMemo<() => JSX.Element>(
    () => () => {
      const sentinel = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (observer && sentinel.current) {
          const observeTarget = sentinel.current;
          observer.observe(sentinel.current);

          return () => {
            observer.unobserve(observeTarget);
            setShouldLoadMore(false);
          };
        }
      }, [observer]);

      return <div ref={sentinel}></div>;
    },
    [observer]
  );

  return {
    InfiniteScrollBottom,
    setScrollContainerRef,
    scrollToTop,
    shouldLoadMore,
  };
}
