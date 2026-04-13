import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldAlert } from "lucide-react";

const CookieConsent = () => {
  const [show, setShow] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("stinger-cookie-consent");
    if (consent === "declined") {
      setBlocked(true);
    } else if (!consent) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("stinger-cookie-consent", "accepted");
    setShow(false);
    setBlocked(false);
  };

  const decline = () => {
    localStorage.setItem("stinger-cookie-consent", "declined");
    setShow(false);
    setBlocked(true);
  };

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-strong rounded-2xl p-8 max-w-md text-center">
          <ShieldAlert size={40} className="text-destructive mx-auto mb-4" />
          <p className="text-base font-semibold text-foreground mb-2">Access Blocked</p>
          <p className="text-sm text-muted-foreground mb-6">
            Stinger Dev requires cookies to function properly. You must accept cookies to use the platform. This includes authentication, preferences, and session management.
          </p>
          <button onClick={accept} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
            Accept Cookies & Enter
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto">
          <div className="glass-strong rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <Cookie size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">Cookie Notice</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Stinger Dev uses cookies for authentication, preferences, and analytics. Cookies are required to use the platform.
                </p>
                <div className="flex gap-2">
                  <button onClick={accept} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90">Accept All</button>
                  <button onClick={decline} className="bg-secondary text-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-secondary/80">Decline</button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
