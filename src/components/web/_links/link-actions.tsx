"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, MoreVertical, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LinkImportCSV from "./link-import-csv";
import CreateLinkForm from "./create-link";
import LinkExportCSV from "@/components/web/_links/link-export-csv";

interface ActionsProps {
  totalLinks?: number; // optional — useful for disabling Export if none exist
  workspaceslug: string;
  setLayout?: React.Dispatch<React.SetStateAction<string>>;
}

export default function LinkActions({
  workspaceslug,
  totalLinks,
}: ActionsProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const handleImportCSV = useCallback(() => {
    setIsImportDialogOpen(true);
  }, []);

  const handleExportCSV = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  return (
    <div className="flex items-center gap-x-2">
      {/* Create a new link */}
      <CreateLinkForm workspaceslug={workspaceslug} />

      {/* Dropdown Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="aspect-square w-10 p-0"
            aria-label="More link actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleImportCSV}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleExportCSV}
            disabled={!totalLinks || totalLinks === 0} // disable if no links
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals (CSV import/export) */}
      <LinkImportCSV
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        workspaceslug={workspaceslug}
      />
      <LinkExportCSV
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        workspaceslug={workspaceslug}
      />
    </div>
  );
}
