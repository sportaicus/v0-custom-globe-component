import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEV_MODE = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export default async function Home() {
  // In dev mode, go straight to app
  if (DEV_MODE) {
    redirect("/app/projects");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app/projects");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-8 px-6 text-center">
        <div className="flex items-center gap-2">
          <Heart className="h-8 w-8 text-primary" />
          <span className="font-serif text-3xl font-bold tracking-tight text-foreground">
            WeddingOS
          </span>
        </div>
        <h1 className="text-balance font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Your Wedding, Organized
        </h1>
        <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
          Manage your budget, vendors, documents, and legal tasks in one
          beautiful place. Built for couples who want to stay in control.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/auth/sign-up">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
