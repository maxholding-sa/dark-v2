"use client";

import React, { useEffect, useState } from "react";
import { SignIn } from "@clerk/nextjs";
import styles from "./page.module.css";

const SignInPage = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={styles.customSigninWrapper} />;
  }

  return (
    <div className={styles.customSigninWrapper}>
      <SignIn
        appearance={{
          baseTheme: undefined,
          variables: {
            colorPrimary: "#ee1d23",
            colorBackground: "transparent",
            colorInputBackground: "rgba(255, 255, 255, 0.1)",
            colorInputText: "#ffffff",
            colorText: "#ffffff",
            borderRadius: "10px",
            direction: "rtl",
          },
          elements: {
            card: {
              background: "rgba(255, 255, 255, 0.25)",
              backdropFilter: "blur(15px)",
              WebkitBackdropFilter: "blur(15px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: "10px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            },
            headerTitle: {
              color: "#ffffff",
            },
            headerSubtitle: {
              color: "#ffffff",
            },
            formButtonPrimary: {
              background: "linear-gradient(135deg, #ee1d23 0%, #ff3d42 100%)",
              border: "none",
              borderRadius: "10px",
            },
            formFieldInput: {
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#ffffff",
              borderRadius: "10px",
              direction: "ltr",
              textAlign: "left",
            },
            formFieldInput__otp: {
              direction: "ltr",
              textAlign: "left",
            },
            formFieldLabel: {
              color: "#ffffff",
            },
            footerActionText: {
              color: "#ffffff",
            },
            footerActionLink: {
              color: "#ee1d23",
            },
          },
        }}
      />
    </div>
  );
};

export default SignInPage;
