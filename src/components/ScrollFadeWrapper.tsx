import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ScrollFadeWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const ScrollFadeWrapper = ({ children, className }: ScrollFadeWrapperProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const checkScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setFadeTop(el.scrollTop > 20);
    setFadeBottom(el.scrollHeight - el.scrollTop - el.clientHeight > 20);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div ref={ref} className={cn(className)}>
        {children}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-background to-transparent transition-opacity duration-300",
          fadeTop ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent transition-opacity duration-300",
          fadeBottom ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
};

export default ScrollFadeWrapper;
