"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if popup has been shown before
    const hasSeenPopup = localStorage.getItem("adPopupShown");

    if (!hasSeenPopup) {
      // Show popup after 2 seconds
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Klaviyo integration
      if (window._learnq) {
        // Identify user
        window._learnq.push([
          "identify",
          {
            $email: email,
            $first_name: name,
          },
        ]);

        // Track event
        window._learnq.push([
          "track",
          "Netflix Free Account Signup",
          {
            email: email,
            name: name,
            source: "homepage_popup",
          },
        ]);
      }

      // Mark as seen
      localStorage.setItem("adPopupShown", "true");

      // Close popup
      setIsOpen(false);

      // Optional: Show success message or redirect
      alert("شكراً لاهتمامك! سنتواصل معك قريباً.");
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("حدث خطأ ما. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("adPopupShown", "true");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent dir="rtl" className="sm:max-w-md bg-gradient-to-br from-blue-400 to-blue-600 text-white border-0 backdrop-blur-lg bg-opacity-80 [&>button]:left-4 [&>button]:right-auto" suppressHydrationWarning>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
           احصل على حساب Netflix مجاناً!
          </DialogTitle>
          <DialogDescription className="text-center text-blue-100">
            سجل الآن واستمتع بالبث غير المحدود. عرض محدود الوقت!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              الاسم الكامل
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="أدخل اسمك الكامل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              عنوان البريد الإلكتروني
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="أدخل بريدك الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-transparent"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-white text-black hover:bg-gray-100 font-bold py-3"
          >
            {isSubmitting ? "جارٍ التسجيل..." : "احصل على حساب Netflix مجاناً!"}
          </Button>
        </form>

        <p className="text-xs text-center text-blue-200 mt-4">
          بالتسجيل، أنت توافق على تلقي رسائل بريد إلكتروني ترويجية منا.
        </p>
      </DialogContent>
    </Dialog>
  );
}
