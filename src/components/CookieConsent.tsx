import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("stinger-cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("stinger-cookie-consent", "accepted");
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem("stinger-cookie-consent", "declined");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto"
        >
          <div className="glass-strong rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <Cookie size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">Cookie Notice</p>
                <p className="text-xs text-muted-foreground mb-3">
                  We use cookies to enhance your experience, store preferences, and track usage. By continuing, you agree to our cookie policy.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={accept}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={decline}
                    className="bg-secondary text-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
              <button onClick={decline} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
