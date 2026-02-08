"use client";

import React from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Mail, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_COLORS: Record<string, string> = {
  prospect: "bg-secondary text-secondary-foreground",
  contacted: "bg-primary/10 text-primary",
  booked: "bg-green-100 text-green-800",
  declined: "bg-destructive/10 text-destructive",
};

const VENDOR_TYPES = [
  "venue",
  "caterer",
  "photographer",
  "videographer",
  "florist",
  "dj",
  "band",
  "officiant",
  "planner",
  "transport",
  "other",
];

interface Vendor {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  status: string;
  quotes: { id: string; amount: number; label: string }[];
}

export function VendorList({
  projectId,
  vendors: initialVendors,
  categories,
  currency,
}: {
  projectId: string;
  vendors: Vendor[];
  categories: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered =
    statusFilter === "all"
      ? initialVendors
      : initialVendors.filter((v) => v.status === statusFilter);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.from("vendors").insert({
      project_id: projectId,
      name: form.get("name") as string,
      type: form.get("type") as string,
      email: (form.get("email") as string) || null,
      phone: (form.get("phone") as string) || null,
      status: "prospect",
    });

    if (error) {
      toast.error("Failed to create vendor.");
    } else {
      toast.success("Vendor added!");
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  const handleStatusChange = async (vendorId: string, newStatus: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("vendors")
      .update({ status: newStatus })
      .eq("id", vendorId);
    if (error) {
      toast.error("Failed to update status.");
    } else {
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">Add Vendor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="v-name">Vendor Name</Label>
                <Input
                  id="v-name"
                  name="name"
                  placeholder="Le Chateau de..."
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="v-type">Type</Label>
                <Select name="type" defaultValue="other">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="v-email">Email</Label>
                  <Input
                    id="v-email"
                    name="email"
                    type="email"
                    placeholder="vendor@email.com"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="v-phone">Phone</Label>
                  <Input
                    id="v-phone"
                    name="phone"
                    placeholder="+33 6..."
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Vendor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <p className="text-muted-foreground">No vendors found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vendor) => {
            const totalQuotes = vendor.quotes?.reduce(
              (s, q) => s + q.amount,
              0
            ) ?? 0;
            return (
              <Card key={vendor.id}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">
                        {vendor.name}
                      </h3>
                      <p className="text-xs capitalize text-muted-foreground">
                        {vendor.type}
                      </p>
                    </div>
                    <Select
                      defaultValue={vendor.status}
                      onValueChange={(v) => handleStatusChange(vendor.id, v)}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1.5 border-0 px-2 text-xs">
                        <Badge
                          variant="secondary"
                          className={
                            STATUS_COLORS[vendor.status] ?? ""
                          }
                        >
                          {vendor.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="booked">Booked</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {vendor.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {vendor.email}
                      </span>
                    )}
                    {vendor.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {vendor.phone}
                      </span>
                    )}
                  </div>

                  {totalQuotes > 0 && (
                    <p className="text-sm font-medium text-foreground">
                      Quotes: {fmt(totalQuotes)}
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 bg-transparent"
                    disabled
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Generate Reply (coming soon)
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
