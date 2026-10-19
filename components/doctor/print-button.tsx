"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Print or save the doctor summary as PDF via the browser's print dialog. */
export function PrintButton() {
  return (
    <Button type="button" variant="outline" className="bg-white print:hidden" onClick={() => window.print()}>
      <Printer className="mr-2 size-4" />
      Print or save as PDF
    </Button>
  );
}
