"use client";

import React from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Mail,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const ANALYSIS_STATUS_MAP: Record<
  string,
  { icon: React.ElementType; label: string; className: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-secondary text-secondary-foreground",
  },
  analyzing: {
    icon: Sparkles,
    label: "Analyzing",
    className: "bg-primary/10 text-primary",
  },
  reviewed: {
    icon: CheckCircle2,
    label: "Reviewed",
    className: "bg-green-100 text-green-800",
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    className: "bg-destructive/10 text-destructive",
  },
};

interface Document {
  id: string;
  file_name: string | null;
  source: string;
  sender_name: string | null;
  sender_email: string | null;
  analysis_status: string;
  confidence: number | null;
  analysis_json: Record<string, unknown> | null;
  created_at: string;
  vendor_id: string | null;
  category_id: string | null;
  vendors: { name: string } | null;
  categories: { name: string } | null;
}

// TODO: Replace with real AI analysis
function generateMockAnalysis(fileName: string) {
  const lower = (fileName || "").toLowerCase();
  let vendor = "Unknown Vendor";
  let category = "Other";
  let amount = 0;

  if (lower.includes("photo")) {
    vendor = "Studio Lumiere";
    category = "Photography & Video";
    amount = 2500;
  } else if (lower.includes("cater") || lower.includes("menu")) {
    vendor = "La Table Gourmande";
    category = "Catering";
    amount = 8500;
  } else if (lower.includes("venue") || lower.includes("chateau")) {
    vendor = "Chateau de Versailles";
    category = "Venue";
    amount = 12000;
  } else if (lower.includes("flower") || lower.includes("flor")) {
    vendor = "Fleurs de Paris";
    category = "Flowers & Decor";
    amount = 1800;
  } else if (lower.includes("music") || lower.includes("dj")) {
    vendor = "DJ Max Events";
    category = "Music & Entertainment";
    amount = 1200;
  } else {
    amount = Math.round(Math.random() * 3000 + 500);
  }

  return {
    detected_vendor: vendor,
    detected_category: category,
    detected_items: [
      { label: `${category} services`, amount, currency: "EUR" },
    ],
    confidence: Math.round(Math.random() * 30 + 70) / 100,
  };
}

export function DocumentsView({
  projectId,
  documents,
  vendors,
  categories,
  currency,
}: {
  projectId: string;
  documents: Document[];
  vendors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const pendingDocs = documents.filter(
    (d) => d.analysis_status === "pending"
  );
  const reviewedDocs = documents.filter(
    (d) => d.analysis_status === "reviewed"
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File;
    const pastedText = form.get("pasted_text") as string;
    const supabase = createClient();

    const fileName = file?.name || "pasted-text.txt";

    const { error } = await supabase.from("documents").insert({
      project_id: projectId,
      file_name: fileName,
      source: file?.size > 0 ? "upload" : "paste",
      raw_text: pastedText || null,
      analysis_status: "pending",
    });

    if (error) {
      toast.error("Failed to upload document.");
    } else {
      toast.success("Document uploaded!");
      setUploadOpen(false);
      router.refresh();
    }
    setUploading(false);
  };

  const handleAnalyze = async (doc: Document) => {
    setAnalyzing(doc.id);
    const supabase = createClient();

    // Simulate analysis delay
    await new Promise((r) => setTimeout(r, 1500));

    const analysis = generateMockAnalysis(doc.file_name ?? "");

    await supabase
      .from("documents")
      .update({
        analysis_status: "reviewed",
        confidence: analysis.confidence,
        analysis_json: analysis as unknown as Record<string, unknown>,
      })
      .eq("id", doc.id);

    toast.success("Analysis complete!");
    setAnalyzing(null);
    router.refresh();
  };

  const handleConfirmAnalysis = async (doc: Document) => {
    if (!doc.analysis_json) return;
    const supabase = createClient();
    const analysis = doc.analysis_json as {
      detected_vendor: string;
      detected_category: string;
      detected_items: { label: string; amount: number; currency: string }[];
    };

    // Find or create vendor
    let vendorId = doc.vendor_id;
    if (!vendorId) {
      const existing = vendors.find(
        (v) =>
          v.name.toLowerCase() === analysis.detected_vendor.toLowerCase()
      );
      if (existing) {
        vendorId = existing.id;
      } else {
        const { data: newVendor } = await supabase
          .from("vendors")
          .insert({
            project_id: projectId,
            name: analysis.detected_vendor,
            status: "prospect",
          })
          .select()
          .single();
        vendorId = newVendor?.id ?? null;
      }
    }

    // Find category
    let categoryId = doc.category_id;
    if (!categoryId) {
      const cat = categories.find(
        (c) =>
          c.name.toLowerCase() === analysis.detected_category.toLowerCase()
      );
      categoryId = cat?.id ?? null;
    }

    // Link document
    await supabase
      .from("documents")
      .update({ vendor_id: vendorId, category_id: categoryId })
      .eq("id", doc.id);

    // Create quotes
    if (vendorId && analysis.detected_items) {
      for (const item of analysis.detected_items) {
        await supabase.from("quotes").insert({
          project_id: projectId,
          vendor_id: vendorId,
          category_id: categoryId,
          document_id: doc.id,
          label: item.label,
          amount: item.amount,
          currency: item.currency,
          status: "received",
        });
      }
    }

    toast.success("Analysis confirmed and linked!");
    router.refresh();
  };

  const handleImportSample = async () => {
    const supabase = createClient();
    const samples = [
      {
        file_name: "venue-chateau-quote.pdf",
        sender_name: "Chateau de Versailles",
        sender_email: "events@chateau.fr",
      },
      {
        file_name: "photographer-studio-lumiere.pdf",
        sender_name: "Studio Lumiere",
        sender_email: "hello@studiolumiere.fr",
      },
      {
        file_name: "catering-menu-proposal.pdf",
        sender_name: "La Table Gourmande",
        sender_email: "info@latable.fr",
      },
    ];

    for (const sample of samples) {
      await supabase.from("documents").insert({
        project_id: projectId,
        file_name: sample.file_name,
        source: "email",
        sender_name: sample.sender_name,
        sender_email: sample.sender_email,
        analysis_status: "pending",
      });
    }
    toast.success("Sample emails imported!");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">
                Upload Document
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="d-file">File (PDF, XLSX, etc.)</Label>
                <Input id="d-file" name="file" type="file" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="d-text">Or Paste Text</Label>
                <textarea
                  id="d-text"
                  name="pasted_text"
                  rows={4}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Paste email or quote text here..."
                />
              </div>
              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={handleImportSample}>
          <Mail className="mr-2 h-4 w-4" />
          Import Sample Emails
        </Button>

        <Button variant="outline" disabled>
          <Mail className="mr-2 h-4 w-4" />
          Connect Gmail (coming soon)
        </Button>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">
            Inbox ({pendingDocs.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({reviewedDocs.length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <DocumentGrid
            docs={pendingDocs}
            analyzing={analyzing}
            onAnalyze={handleAnalyze}
            onConfirm={handleConfirmAnalysis}
            fmt={fmt}
          />
        </TabsContent>

        <TabsContent value="reviewed" className="mt-4">
          <DocumentGrid
            docs={reviewedDocs}
            analyzing={analyzing}
            onAnalyze={handleAnalyze}
            onConfirm={handleConfirmAnalysis}
            fmt={fmt}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <DocumentGrid
            docs={documents}
            analyzing={analyzing}
            onAnalyze={handleAnalyze}
            onConfirm={handleConfirmAnalysis}
            fmt={fmt}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocumentGrid({
  docs,
  analyzing,
  onAnalyze,
  onConfirm,
  fmt,
}: {
  docs: Document[];
  analyzing: string | null;
  onAnalyze: (doc: Document) => void;
  onConfirm: (doc: Document) => void;
  fmt: (n: number) => string;
}) {
  if (docs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No documents here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((doc) => {
        const statusInfo = ANALYSIS_STATUS_MAP[doc.analysis_status] ??
          ANALYSIS_STATUS_MAP.pending;
        const StatusIcon = statusInfo.icon;
        const analysis = doc.analysis_json as {
          detected_vendor?: string;
          detected_category?: string;
          detected_items?: { label: string; amount: number }[];
          confidence?: number;
        } | null;

        return (
          <Card key={doc.id}>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium text-foreground">
                    {doc.file_name ?? "Document"}
                  </span>
                </div>
                <Badge className={statusInfo.className}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {statusInfo.label}
                </Badge>
              </div>

              {doc.sender_name && (
                <p className="text-xs text-muted-foreground">
                  From: {doc.sender_name}
                  {doc.sender_email && ` <${doc.sender_email}>`}
                </p>
              )}

              {doc.vendors && (
                <p className="text-xs text-muted-foreground">
                  Vendor: {doc.vendors.name}
                </p>
              )}

              {analysis && doc.analysis_status === "reviewed" && (
                <div className="rounded-lg border border-border bg-muted p-3">
                  <p className="text-xs font-medium text-foreground">
                    Detected: {analysis.detected_vendor}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Category: {analysis.detected_category}
                  </p>
                  {analysis.detected_items?.map((item, i) => (
                    <p key={i} className="text-xs text-foreground">
                      {item.label}: {fmt(item.amount)}
                    </p>
                  ))}
                  {analysis.confidence && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Confidence: {Math.round(analysis.confidence * 100)}%
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {doc.analysis_status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => onAnalyze(doc)}
                    disabled={analyzing === doc.id}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {analyzing === doc.id ? "Analyzing..." : "Analyze"}
                  </Button>
                )}
                {doc.analysis_status === "reviewed" && !doc.vendor_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onConfirm(doc)}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Confirm & Link
                  </Button>
                )}
                {doc.analysis_status === "reviewed" && doc.vendor_id && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Linked
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
