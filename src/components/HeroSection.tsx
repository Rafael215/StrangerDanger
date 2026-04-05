import { motion } from "framer-motion";
import { Shield, Camera, Zap, TreePine } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroSectionProps {
  onScrollToUpload: () => void;
}

const HeroSection = ({ onScrollToUpload }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Misty forest trail"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="absolute inset-0 topo-pattern opacity-30" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8"
          >
            <Shield className="w-4 h-4" />
            AI-Powered Wildlife Safety
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Stranger</span>
            <span className="text-primary">Danger</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Snap a photo. Identify the animal. Know your threat level instantly.
            Your AI field guide for staying safe in the wild.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onScrollToUpload}
              className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Camera className="w-5 h-5" />
              Identify an Animal
            </motion.button>
          </div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {[
              { icon: Camera, text: "Photo ID" },
              { icon: Shield, text: "Threat Assessment" },
              { icon: Zap, text: "Instant Results" },
            ].map((feat) => (
              <div
                key={feat.text}
                className="flex items-center gap-2 px-4 py-2 glass-card rounded-full text-sm text-muted-foreground"
              >
                <feat.icon className="w-3.5 h-3.5 text-primary" />
                {feat.text}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5"
        >
          <div className="w-1.5 h-2.5 rounded-full bg-primary animate-pulse-glow" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
