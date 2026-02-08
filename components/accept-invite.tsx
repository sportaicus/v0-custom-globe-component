"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Invite {
  id: string;
  project_id: string;
  role: string;
  token: string;
}

export function AcceptInvite({
  invite,
  projectName,
  userId,
}: {
  invite: Invite;
  projectName: string;
  userId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    const supabase = createClient();

    // Add as project member
    const { error: memberErr } = await supabase
      .from("project_members")
      .insert({
        project_id: invite.project_id,
        user_id: userId,
        role: invite.role,
      });

    if (memberErr) {
      if (memberErr.code === "23505") {
        toast.info("You are already a member of this project.");
      } else {
        toast.error("Failed to accept invite.");
        setLoading(false);
        return;
      }
    }

    // Mark invite as accepted
    await supabase
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    toast.success("Invite accepted!");
    router.push(`/app/projects/${invite.project_id}/dashboard`);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Card className="mx-6 w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-6 p-8">
          <Heart className="h-10 w-10 text-primary" />
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold text-foreground">
              You{"'"}re Invited!
            </h1>
            <p className="mt-2 text-muted-foreground">
              You{"'"}ve been invited to join{" "}
              <strong className="text-foreground">{projectName}</strong> as a{" "}
              <strong className="text-foreground">{invite.role}</strong>.
            </p>
          </div>
          <Button onClick={handleAccept} disabled={loading} className="w-full">
            {loading ? "Accepting..." : "Accept Invite"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
