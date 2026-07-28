'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Stethoscope, CalendarClock, Users, FileSpreadsheet, ArrowRight, Activity, ShieldCheck } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (!mounted) return null;
  if (isAuthenticated) return <div className="h-screen bg-background" />;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-x-hidden flex flex-col">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Stethoscope className="h-6 w-6" />
            <span className="font-bold tracking-tight text-lg text-foreground">ClinicShift</span>
          </div>
          <Button variant="ghost" onClick={() => router.push('/login')} className="font-medium">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto w-full text-center space-y-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4"
          >
            <Activity className="h-4 w-4" />
            <span>Shift scheduling, redefined.</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground"
          >
            The modern operating system <br className="hidden md:block" /> for your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">clinic workforce.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Say goodbye to messy spreadsheets. ClinicShift empowers your managers to organize schedules, and lets doctors and nurses claim shifts seamlessly in real-time.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button size="lg" className="rounded-full h-12 px-8 text-base shadow-lg shadow-primary/25" onClick={() => router.push('/login')}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-full h-12 px-8 text-base bg-background/50 backdrop-blur-sm" onClick={() => router.push('/login')}>
              View Demo
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="mt-12 max-w-lg mx-auto bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-6 text-left shadow-xl"
          >
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-primary" />
              Try the Live Demo
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/50">
                <div>
                  <span className="font-semibold text-foreground block">Manager Access</span>
                  <span>manager@clinic.com</span>
                </div>
                <code className="bg-muted px-2 py-1 rounded text-xs font-mono">password123</code>
              </div>
              <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/50">
                <div>
                  <span className="font-semibold text-foreground block">Staff Access</span>
                  <span>staff1@clinic.com</span>
                </div>
                <code className="bg-muted px-2 py-1 rounded text-xs font-mono">password123</code>
              </div>
              <p className="text-xs pt-2 text-center opacity-80">
                Staff log in here to claim shifts. Managers can assign them and upload CSVs!
              </p>
            </div>
          </motion.div>
        </div>

        {/* Ambient Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />

        {/* Features Grid */}
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 relative z-10"
        >
          <motion.div variants={item} className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-md transition-all group">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <CalendarClock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Real-time Claims</h3>
            <p className="text-muted-foreground text-sm">Staff can claim available shifts instantly. Strict backend validations prevent overlapping claims.</p>
          </motion.div>

          <motion.div variants={item} className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-md transition-all group">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Rule Enforcement</h3>
            <p className="text-muted-foreground text-sm">Transactional consistency guarantees capacity limits and profession rules are never bypassed.</p>
          </motion.div>

          <motion.div variants={item} className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-md transition-all group">
            <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Legacy Imports</h3>
            <p className="text-muted-foreground text-sm">Intelligent CSV parsing cleans dirty data, merges duplicate shifts, and provides a full import report.</p>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} ClinicShift. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
