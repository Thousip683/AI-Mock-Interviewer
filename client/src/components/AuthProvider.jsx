import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { setGetToken } from "@/lib/api";

export default function AuthProvider({ children }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // Pass Clerk's getToken to the axios interceptor so every
      // request automatically gets a fresh, non-expired JWT.
      setGetToken(getToken);
    } else {
      setGetToken(null);
    }

    setReady(true);
  }, [isSignedIn, isLoaded, getToken]);

  if (!ready) return null;

  return children;
}