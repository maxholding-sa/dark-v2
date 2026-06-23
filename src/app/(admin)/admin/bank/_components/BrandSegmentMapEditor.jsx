"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  VALID_INSURANCE_SEGMENTS,
  brandSegmentMapToJson,
  brandSegmentRowsToMap,
  buildBrandSegmentRowsForMakes,
  mergeInventorySegmentHints,
  parseBrandSegmentMap,
} from "@/lib/brand-segment";
import { DEFAULT_BRAND_SEGMENT_MAP } from "@/lib/loan-calculator";

const SOURCE_LABELS = {
  saved: "محفوظ",
  default: "افتراضي",
  inventory: "من السيارات",
  unassigned: "يحتاج تعيين",
};

export default function BrandSegmentMapEditor({ initialValue = "", onChange }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const emitChange = (nextRows) => {
    const map = brandSegmentRowsToMap(nextRows);
    onChange(brandSegmentMapToJson(map));
  };

  const loadInventoryBrands = async (savedJson = initialValue) => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/car-makes?withSegments=1");
      const json = await res.json();
      const makes = Array.isArray(json.makes) ? json.makes : [];
      const hints = json.segmentHints && typeof json.segmentHints === "object" ? json.segmentHints : {};

      if (makes.length === 0) {
        setRows([]);
        setLoadError("لا توجد ماركات في مخزون السيارات بعد.");
        onChange("{}");
        return;
      }

      const savedMap = parseBrandSegmentMap(savedJson, {});
      let nextRows = buildBrandSegmentRowsForMakes(makes, DEFAULT_BRAND_SEGMENT_MAP, savedMap);
      nextRows = mergeInventorySegmentHints(nextRows, hints);
      setRows(nextRows);
      emitChange(nextRows);
    } catch (error) {
      setLoadError(error.message || "تعذر تحميل الماركات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryBrands(initialValue);
    // Remount via key when dialog opens with different bank / saved map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSegmentChange = (make, segment) => {
    setRows((prev) => {
      const next = prev.map((row) =>
        row.make === make ? { ...row, segment, source: "saved" } : row
      );
      emitChange(next);
      return next;
    });
  };

  const unassignedCount = rows.filter((row) => !row.segment).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label>ربط الماركات بفئات التأمين (A–G)</Label>
          <p className="mt-1 text-xs text-white/50">
            تُحمَّل الماركات تلقائياً من سيارات المعرض. عدّل الفئة لكل ماركة ثم احفظ البنك.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => loadInventoryBrands(initialValue)}
          disabled={loading}
          className="shrink-0 self-start sm:self-auto"
        >
          {loading ? (
            <Loader2 className="ml-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="ml-1 h-4 w-4" />
          )}
          تحديث من الماركات
        </Button>
      </div>

      {loadError ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {loadError}
        </p>
      ) : null}

      {!loadError && rows.length > 0 ? (
        <>
          {unassignedCount > 0 ? (
            <p className="text-xs text-amber-300">
              {unassignedCount} ماركة بدون فئة — اختر فئة التأمين قبل حفظ العروض لهذه السيارات.
            </p>
          ) : (
            <p className="text-xs text-emerald-400/90">جميع الماركات في المخزون لها فئة تأمين.</p>
          )}

          <div className="max-h-56 overflow-y-auto rounded-md border border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الماركة</TableHead>
                  <TableHead className="text-right">فئة التأمين</TableHead>
                  <TableHead className="text-right">المصدر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.make}>
                    <TableCell className="font-medium">{row.make}</TableCell>
                    <TableCell>
                      <Select
                        value={row.segment || ""}
                        onValueChange={(segment) => handleSegmentChange(row.make, segment)}
                      >
                        <SelectTrigger className="h-9 w-full min-w-[7rem]">
                          <SelectValue placeholder="اختر الفئة" />
                        </SelectTrigger>
                        <SelectContent>
                          {VALID_INSURANCE_SEGMENTS.map((segment) => (
                            <SelectItem key={segment} value={segment}>
                              {segment}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-white/50">
                      {SOURCE_LABELS[row.source] || row.source}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-sm text-white/50">
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          جاري تحميل الماركات...
        </div>
      ) : null}
    </div>
  );
}
