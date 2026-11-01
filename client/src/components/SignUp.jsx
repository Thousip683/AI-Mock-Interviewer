import { loginDestination } from '@/lib/navigation';
import { Link, useLocation } from 'react-router-dom';
import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  const destination = loginDestination(useLocation());
  return (
    <div className="flex flex-col gap-5 justify-center items-center min-h-screen">
      <Link to="/" className="text-sm text-primary">Back to home</Link>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={`/login?redirect=${encodeURIComponent(destination)}`}
        forceRedirectUrl={destination}
      />
    </div>
  );
}