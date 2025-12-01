import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Sparkles,
  BookOpen,
  ArrowRight,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogIn: () => void;
}

// Hook for detecting when element is in viewport
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// Animated counter component
function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, isInView } = useInView();
  const numericTarget = parseInt(target.replace(/\D/g, ""));

  useEffect(() => {
    if (!isInView) return;

    const duration = 2000;
    const steps = 60;
    const increment = numericTarget / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= numericTarget) {
        setCount(numericTarget);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, numericTarget]);

  return (
    <div ref={ref} className="text-2xl sm:text-4xl text-blue-500 mb-1 sm:mb-2 font-bold">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

export default function LandingPage({ onGetStarted, onLogIn }: LandingPageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Animation variants for different sections
  const statsSection = useInView(0.2);
  const featuresSection = useInView(0.1);
  const howItWorksSection = useInView(0.1);
  const ctaSection = useInView(0.2);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-gray-900"></div>
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl transition-all duration-[3000ms]"
          style={{ 
            transform: isLoaded ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(-50px)',
            opacity: isLoaded ? 1 : 0 
          }}
        ></div>
        <div 
          className="absolute top-1/2 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl transition-all duration-[4000ms] delay-300"
          style={{ 
            transform: isLoaded ? 'scale(1)' : 'scale(0.5)',
            opacity: isLoaded ? 1 : 0 
          }}
        ></div>
        <div 
          className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl transition-all duration-[5000ms] delay-500"
          style={{ 
            transform: isLoaded ? 'scale(1) translateX(-50%)' : 'scale(0.5) translateX(-50%)',
            opacity: isLoaded ? 1 : 0 
          }}
        ></div>
      </div>

      {/* Navigation */}
      <nav 
        className="border-b border-gray-800 transition-all duration-700"
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'translateY(0)' : 'translateY(-20px)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-2 group cursor-pointer">
              <img
                src="/favicon_io (1)/android-chrome-512x512.png"
                alt="BrainDeck Logo"
                className="w-8 h-8 rounded transition-transform duration-300 group-hover:rotate-12"
              />
              <span className="text-lg sm:text-xl font-semibold">
                BrainDeck
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
              <a
                href="#features"
                className="text-gray-400 hover:text-white transition-colors relative group"
              >
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a
                href="#how-it-works"
                className="text-gray-400 hover:text-white transition-colors relative group"
              >
                How it Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={onLogIn}
                className="bg-transparent border border-gray-700 hover:border-blue-500 hover:text-blue-400 text-white px-4 sm:px-6 py-2 rounded-lg transition-all duration-300 text-sm sm:text-base"
              >
                Log In
              </button>
              <button 
                onClick={onGetStarted}
                className="bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 text-white px-4 sm:px-6 py-2 rounded-lg transition-all duration-300 text-sm sm:text-base transform hover:-translate-y-0.5"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div 
            className="inline-flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-full px-4 py-2 mb-6 sm:mb-8 transition-all duration-700"
            style={{
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)'
            }}
          >
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-xs sm:text-sm text-gray-300">
              AI-Powered Study Tool
            </span>
          </div>

          <h1 
            className="text-3xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6 px-2 font-bold leading-tight transition-all duration-700 delay-150"
            style={{
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'translateY(0)' : 'translateY(30px)'
            }}
          >
            Transform Your Study Materials into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 animate-gradient">
              Smart Decks
            </span>
          </h1>

          <p 
            className="text-base sm:text-xl text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto px-2 transition-all duration-700 delay-300"
            style={{
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'translateY(0)' : 'translateY(30px)'
            }}
          >
            Import your notes, PDFs, or any study material and
            let AI create personalized study decks instantly.
            Learn smarter, not harder with BrainDeck.
          </p>

          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 transition-all duration-700 delay-500"
            style={{
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'translateY(0)' : 'translateY(30px)'
            }}
          >
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 group hover:shadow-xl hover:shadow-blue-500/25 transform hover:-translate-y-1"
            >
              Start Studying Free
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>

          {/* Stats */}
          <div 
            ref={statsSection.ref}
            className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-20 max-w-2xl mx-auto px-4"
          >
            {[
              { value: "10000", suffix: "+", label: "Decks Created", delay: 0 },
              { value: "95", suffix: "%", label: "Success Rate", delay: 150 },
              { value: "1000", suffix: "+", label: "Students", delay: 300 }
            ].map((stat, index) => (
              <div 
                key={index}
                className="transition-all duration-700"
                style={{
                  opacity: statsSection.isInView ? 1 : 0,
                  transform: statsSection.isInView ? 'translateY(0)' : 'translateY(30px)',
                  transitionDelay: `${stat.delay}ms`
                }}
              >
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                <div className="text-xs sm:text-base text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={featuresSection.ref}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20"
      >
        <div 
          className="text-center mb-12 sm:mb-16 transition-all duration-700"
          style={{
            opacity: featuresSection.isInView ? 1 : 0,
            transform: featuresSection.isInView ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
          <h2 className="text-3xl sm:text-4xl mb-3 sm:mb-4 font-bold">
            What BrainDeck has to Offer
          </h2>
          <p className="text-base sm:text-xl text-gray-400">
            Turn Every Study Session into Progress
          </p>
        </div>

        <div className="grid md:grid-cols-6 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {[
            { 
              icon: Upload, 
              title: "Import Your Material", 
              description: "Upload PDFs, Word docs, PowerPoints, or paste your notes. BrainDeck will handle it for you.",
              colSpan: "md:col-span-2",
              delay: 0
            },
            { 
              icon: Sparkles, 
              title: "AI Generation", 
              description: "Our AI analyzes your content and creates tailored flashcards that focus on key concepts and definitions.",
              colSpan: "md:col-span-2",
              delay: 100
            },
            { 
              icon: BookOpen, 
              title: "Smart Study", 
              description: "Track your progress, review difficult cards, and master your material with your choice of studying.",
              colSpan: "md:col-span-2",
              delay: 200
            },
            { 
              icon: TrendingUp, 
              title: "Smart Suggestions", 
              description: "Get personalized study recommendations based on your study history and performance patterns.",
              colSpan: "md:col-span-2 md:col-start-2",
              delay: 300
            },
            { 
              icon: BarChart3, 
              title: "Progress Analytics", 
              description: "Look back at your learning journey with detailed analytics and insights into your study performance.",
              colSpan: "md:col-span-2",
              delay: 400
            }
          ].map((feature, index) => (
            <div 
              key={index}
              className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 sm:p-8 hover:border-blue-500/50 hover:bg-gray-900/80 transition-all duration-500 cursor-pointer group ${feature.colSpan}`}
              style={{
                opacity: featuresSection.isInView ? 1 : 0,
                transform: featuresSection.isInView ? 'translateY(0)' : 'translateY(40px)',
                transitionDelay: `${feature.delay}ms`
              }}
            >
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4 sm:mb-6 transition-all duration-300 group-hover:bg-blue-600/30 group-hover:scale-110">
                <feature.icon className="w-6 h-6 text-blue-500 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-xl sm:text-2xl mb-3 sm:mb-4 font-semibold group-hover:text-blue-400 transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        ref={howItWorksSection.ref}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20"
      >
        <div 
          className="text-center mb-12 sm:mb-16 transition-all duration-700"
          style={{
            opacity: howItWorksSection.isInView ? 1 : 0,
            transform: howItWorksSection.isInView ? 'translateY(0)' : 'translateY(30px)'
          }}
        >
          <h2 className="text-3xl sm:text-4xl mb-3 sm:mb-4 font-bold">
            How It Works
          </h2>
          <p className="text-base sm:text-xl text-gray-400">
            Get started in three simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 sm:gap-12 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600"></div>
          
          {[
            { step: 1, title: "Upload Your Files", description: "Upload your study materials or paste your notes directly into BrainDeck.", delay: 0 },
            { step: 2, title: "AI Generates Decks", description: "Our AI processes your content and generates comprehensive flashcard decks in seconds.", delay: 200 },
            { step: 3, title: "Start Studying", description: "Review your decks, track progress, and pass your exams with confidence.", delay: 400 }
          ].map((item, index) => (
            <div 
              key={index}
              className="text-center relative transition-all duration-700"
              style={{
                opacity: howItWorksSection.isInView ? 1 : 0,
                transform: howItWorksSection.isInView ? 'translateY(0)' : 'translateY(40px)',
                transitionDelay: `${item.delay}ms`
              }}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-xl sm:text-2xl mx-auto mb-4 sm:mb-6 font-bold relative z-10 shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-110 hover:shadow-blue-500/50">
                {item.step}
              </div>
              <h3 className="text-xl sm:text-2xl mb-3 sm:mb-4 font-semibold">
                {item.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={ctaSection.ref}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20"
      >
        <div 
          className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden transition-all duration-700"
          style={{
            opacity: ctaSection.isInView ? 1 : 0,
            transform: ctaSection.isInView ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.98)'
          }}
        >
          {/* Animated background elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
          
          <h2 className="text-2xl sm:text-4xl mb-3 sm:mb-4 font-bold relative z-10">
            Ready to Transform Your Study Routine
          </h2>
          <p className="text-base sm:text-xl mb-6 sm:mb-8 opacity-90 relative z-10">
            Join hundreds of students who are learning smarter
            with BrainDeck
          </p>
          <button 
            onClick={onGetStarted}
            className="bg-white text-blue-600 hover:bg-gray-100 px-6 sm:px-8 py-3 sm:py-4 rounded-lg transition-all duration-300 font-semibold relative z-10 hover:shadow-xl transform hover:-translate-y-1"
          >
            Get Started for Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
          <div className="flex items-center gap-2 mb-3 sm:mb-4 justify-center group cursor-pointer">
            <img
              src="/favicon_io (1)/android-chrome-512x512.png"
              alt="BrainDeck Logo"
              className="w-8 h-8 rounded transition-transform duration-300 group-hover:rotate-12"
            />
            <span className="text-lg sm:text-xl font-semibold">
              BrainDeck
            </span>
          </div>
          <p className="text-sm sm:text-base text-gray-400">
            AI-powered study deck generator for any Learner
          </p>

          <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center text-gray-400 text-sm sm:text-base">
            <p>&copy; 2025 BrainDeck. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Custom CSS for gradient animation */}
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
