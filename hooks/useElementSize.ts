import { RefObject, useEffect, useState } from 'react';

interface ElementSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: ElementSize = { width: 0, height: 0 };

export const useElementSize = <T extends HTMLElement>(
  ref: RefObject<T | null>
): ElementSize => {
  const [size, setSize] = useState<ElementSize>(DEFAULT_SIZE);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize((current) =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height }
      );
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => {
        window.removeEventListener('resize', updateSize);
      };
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
};
