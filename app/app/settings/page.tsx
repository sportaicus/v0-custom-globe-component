import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";
import { Heart } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/app/projects" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <span className="font-serif text-lg font-semibold text-foreground">
              WeddingOS
            </span>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-8 font-serif text-3xl font-bold text-foreground">
          Settings
        </h1>
        <SettingsForm
          profile={profile ?? { id: user.id, full_name: "", avatar_url: "" }}
          email={user.email ?? ""}
        />
      </div>
    </div>
  );
}
