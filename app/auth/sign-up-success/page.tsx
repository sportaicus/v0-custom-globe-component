import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
            WeddingOS
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We sent you a confirmation link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {"You've successfully signed up. Please check your email to confirm your account before signing in."}
            </p>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="text-foreground underline underline-offset-4"
              >
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
