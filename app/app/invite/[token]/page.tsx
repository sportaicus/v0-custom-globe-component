import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AcceptInvite } from "@/components/accept-invite";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/app/invite/${token}`);
  }

  // Use service role would be needed in production, but for now use the RLS policy that allows any auth user to see invites
  const { data: invite } = await supabase
    .from("invites")
    .select("*, projects(name)")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (!invite) notFound();

  // Check if expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Invite Expired
          </h1>
          <p className="mt-2 text-muted-foreground">
            This invite link has expired. Ask the project owner for a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AcceptInvite
      invite={invite}
      projectName={
        (invite.projects as { name: string } | null)?.name ?? "a wedding project"
      }
      userId={user.id}
    />
  );
}
