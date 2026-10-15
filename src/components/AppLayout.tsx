import {
  Activity,
  Brain,
  Dumbbell,
  Leaf,
  LogOut,
  Menu,
  Salad,
  TrendingUp,
  UserRound,
  Watch,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { HomeSection } from "../types/navigation";

type AppLayoutPage = HomeSection;

interface AppLayoutProps {
  currentPage: AppLayoutPage;
  onNavigate: (page: AppLayoutPage) => void;
  onLogout: () => void;
  children: ReactNode;
}

interface SavedElementScroll {
  path: number[];
  top: number;
  left: number;
}

interface SavedPageScroll {
  windowX: number;
  windowY: number;
  elements: SavedElementScroll[];
}

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "ai-assistant", label: "AI Assistant", icon: Brain },
  { id: "diet-plan", label: "Diet Plan", icon: Salad },
  { id: "workout-plan", label: "Workout Plan", icon: Dumbbell },
  { id: "progress", label: "My Progress", icon: TrendingUp },
  { id: "wearable-tracker", label: "Wearable Tracker", icon: Watch },
  { id: "profile", label: "My Profile", icon: UserRound },
] as const;

function getElementPath(root: HTMLElement, element: HTMLElement): number[] | null {
  if (element === root) return [];

  const path: number[] = [];
  let current: HTMLElement = element;
  while (current !== root) {
    const parent = current.parentElement;
    if (!parent) return null;
    const index = Array.from(parent.children).indexOf(current);
    if (index < 0) return null;
    path.unshift(index);
    current = parent;
  }
  return path;
}

function getElementAtPath(root: HTMLElement, path: number[]): HTMLElement | null {
  let current: Element = root;
  for (const index of path) {
    const next = current.children.item(index);
    if (!(next instanceof HTMLElement)) return null;
    current = next;
  }
  return current instanceof HTMLElement ? current : null;
}

function isScrollable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const allowsScrolling = ["auto", "scroll", "overlay"].includes(style.overflowY) ||
    ["auto", "scroll", "overlay"].includes(style.overflowX);
  return allowsScrolling && (
    element.scrollHeight > element.clientHeight + 1 ||
    element.scrollWidth > element.clientWidth + 1
  );
}

function capturePageScroll(root: HTMLElement): SavedPageScroll {
  const candidates = [
    root,
    ...Array.from(
      root.querySelectorAll<HTMLElement>(
        "main, [data-preserve-scroll], [class*='overflow-auto'], [class*='overflow-y-auto'], [class*='overflow-scroll'], [class*='overflow-y-scroll']",
      ),
    ),
  ];
  const uniqueCandidates = Array.from(new Set(candidates));
  const elements: SavedElementScroll[] = [];

  for (const element of uniqueCandidates) {
    if (element !== root && !isScrollable(element)) continue;
    const path = getElementPath(root, element);
    if (path) elements.push({ path, top: element.scrollTop, left: element.scrollLeft });
  }

  return { windowX: window.scrollX, windowY: window.scrollY, elements };
}

function restorePageScroll(root: HTMLElement, saved: SavedPageScroll): void {
  // Restore nested scrollers first, then the layout's main scroll container.
  for (const item of [...saved.elements].sort((a, b) => b.path.length - a.path.length)) {
    const element = getElementAtPath(root, item.path);
    if (!element) continue;
    element.scrollTop = item.top;
    element.scrollLeft = item.left;
  }
  window.scrollTo({ left: saved.windowX, top: saved.windowY, behavior: "auto" });
}

export default function AppLayout({
  currentPage,
  onNavigate,
  onLogout,
  children,
}: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const contentRef = useRef<HTMLElement | null>(null);
  const scrollPositions = useRef<Partial<Record<AppLayoutPage, SavedPageScroll>>>({});
  const captureFrame = useRef<number | null>(null);
  const restoreFrames = useRef<number[]>([]);

  // Keep each section's scroll location updated as the user scrolls, instead of
  // relying only on an effect cleanup after the section has already changed.
  const saveCurrentScroll = useCallback(() => {
    if (captureFrame.current !== null) return;
    captureFrame.current = window.requestAnimationFrame(() => {
      captureFrame.current = null;
      const content = contentRef.current;
      if (content) scrollPositions.current[currentPage] = capturePageScroll(content);
    });
  }, [currentPage]);

  const saveCurrentScrollImmediately = useCallback(() => {
    // Cancel any delayed capture from the outgoing section so it cannot
    // overwrite that section with the incoming section's DOM after navigation.
    if (captureFrame.current !== null) {
      window.cancelAnimationFrame(captureFrame.current);
      captureFrame.current = null;
    }
    const content = contentRef.current;
    if (content) scrollPositions.current[currentPage] = capturePageScroll(content);
  }, [currentPage]);

  useEffect(() => {
    window.addEventListener("scroll", saveCurrentScroll, { passive: true });
    return () => window.removeEventListener("scroll", saveCurrentScroll);
  }, [saveCurrentScroll]);

  useEffect(() => {
    return () => {
      if (captureFrame.current !== null) {
        window.cancelAnimationFrame(captureFrame.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const saved = scrollPositions.current[currentPage];
    if (!content) return;

    if (!saved) {
      content.scrollTop = 0;
      window.scrollTo({ left: 0, top: 0, behavior: "auto" });
      return;
    }

    // The page content can need an extra frame to lay out after React switches it.
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        const currentContent = contentRef.current;
        if (currentContent) restorePageScroll(currentContent, saved);
      });
      restoreFrames.current.push(secondFrame);
    });
    restoreFrames.current.push(firstFrame);

    return () => {
      for (const frame of restoreFrames.current) window.cancelAnimationFrame(frame);
      restoreFrames.current = [];
    };
  }, [currentPage]);

  const navigate = (page: AppLayoutPage) => {
    saveCurrentScrollImmediately();
    setMobileOpen(false);
    onNavigate(page);
  };

  return (
    <div className="min-h-screen bg-[#F6F2E9] text-[#344C3D] lg:min-h-0 lg:h-screen">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#344C3D]/10 bg-[#F6F2E9] px-5 py-3 lg:hidden">
        <button type="button" onClick={() => navigate("dashboard")} className="flex items-center gap-2" aria-label="Go to dashboard">
          <Leaf size={22} className="text-[#344C3D]" />
          <span className="font-serif text-xl font-semibold">Your<span className="text-[#A87945]">Arogyum</span></span>
        </button>
        <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} className="rounded-lg p-2 hover:bg-[#DCE3D5]">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[250px] border-r border-[#344C3D]/10 bg-[#F6F2E9] transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <button type="button" onClick={() => navigate("dashboard")} aria-label="Go to dashboard" className="flex h-[82px] shrink-0 items-center gap-3 border-b border-[#344C3D]/10 px-6 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#344C3D] text-[#F6F2E9]"><Leaf size={21} strokeWidth={1.7} /></span>
            <span className="font-serif text-lg font-semibold tracking-tight text-[#344C3D]">Your<span className="text-[#A87945]">Arogyum</span></span>
          </button>

          <nav aria-label="Main navigation" className="flex-1 px-3 pt-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={active ? "page" : undefined} className={`mb-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[13px] transition-colors ${active ? "bg-[#DCE3D5] font-semibold text-[#263A2E]" : "text-[#596458] hover:bg-[#EBEEE5] hover:text-[#263A2E]"}`}>
                  <Icon size={18} strokeWidth={active ? 2 : 1.7} className={active ? "text-[#344C3D]" : "text-[#77796F]"} />
                  <span>{item.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#A87945]" />}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-[#344C3D]/10 p-3">
            <button type="button" onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] text-[#596458] transition-colors hover:bg-[#EBEEE5] hover:text-[#263A2E]"><LogOut size={18} strokeWidth={1.7} />Log out</button>
            <p className="px-3.5 pb-1 pt-2 text-[10px] text-[#77796F]">YourArogyum · Preventive wellness</p>
          </div>
        </div>
      </aside>

      <main
        ref={contentRef}
        onScrollCapture={saveCurrentScroll}
        className="min-w-0 lg:ml-[250px] lg:h-screen lg:overflow-y-auto"
      >
        {children}
      </main>
    </div>
  );
}
