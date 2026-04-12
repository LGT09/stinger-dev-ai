import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

interface SplashScreenProps {
  onComplete: () => void;
  visible: boolean;
}

const SplashScreen = ({ onComplete, visible }: SplashScreenProps) => {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.img
            src={logo}
            alt="Stinger Dev"
            className="w-32 h-32 mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 1 }}
          />
          <motion.p
            className="text-sm text-muted-foreground font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            ⚡ Powered by AI
          </motion.p>
          <motion.p
            className="text-xs text-muted-foreground mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            Created by Vincent Ganiza — Traxxion Tech 🇿🇼
          </motion.p>
          <motion.p
            className="text-xs text-muted-foreground mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1] }}
            transition={{ delay: 1.6 }}
            onAnimationComplete={() => setTimeout(onComplete, 800)}
          >
            © 2026 All Rights Reserved
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
