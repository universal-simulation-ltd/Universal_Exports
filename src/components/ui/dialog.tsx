import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // ⚠️ z-[1100], not z-50. The SDK's UniversalAppsNavBar sets an inline
      // `zIndex: 1000`, which an author class can never outrank — so at
      // Tailwind's z-50 ceiling this backdrop dimmed the page while the bar
      // stayed lit on top of it. Radix portals this to <body>, so nothing
      // in between caps the value.
      "fixed inset-0 z-[1100] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // A flex COLUMN capped at the viewport, not one box that can grow past
        // it. `max-h-[min(100%,100dvh)]`: on a fixed element `100%` is the
        // layout viewport and `100dvh` shrinks with iOS's browser chrome, so
        // min() takes whichever is actually visible. The header, the Close
        // button and DialogFooter live OUTSIDE DialogBody, which is the only
        // part that scrolls — that is what stops a tall dialog scrolling its
        // own title off the top of a phone. Vertical padding picks up the
        // safe-area insets once the dialog is tall enough to reach the notch.
        "fixed left-[50%] top-[50%] z-[1100] flex max-h-[min(100%,100dvh)] w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col gap-4 overflow-hidden border bg-background px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
      {/* Pinned to the dialog frame, never inside the scrolling body — and its
          `top` clears the notch on the same terms as the content padding. */}
      <DialogPrimitive.Close className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex shrink-0 flex-col space-y-1.5 pr-8 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

/** The only part of a dialog that scrolls. Put the fields in here and leave the
 *  header and the buttons outside it, so neither can be scrolled out of reach on
 *  a 390x844 screen. The negative margin lets the scrollbar hug the dialog edge
 *  while the content keeps its 1.5rem gutter. */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("-mx-6 min-h-0 flex-1 overflow-y-auto px-6", className)} {...props} />
);
DialogBody.displayName = "DialogBody";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex shrink-0 flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
