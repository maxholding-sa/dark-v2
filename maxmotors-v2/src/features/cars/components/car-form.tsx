"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAction } from "@/hooks/use-action";
import { createTranslator } from "@/i18n";
import { routes } from "@/config/routes";
import {
  carFormSchema,
  emptyCarForm,
  toCarFormValues,
  toCarPayload,
  type CarFormValues,
} from "../lib/car-form-schema";
import { createCarAction, updateCarAction, type CarDto } from "@/server/modules/cars/client";

interface CarFormProps {
  /** Present when editing; absent when creating. */
  car?: CarDto;
}

const STATUS_OPTIONS = ["AVAILABLE", "UNAVAILABLE", "SOLD"] as const;

/**
 * One form for create and edit.
 *
 * v1 had `AddCarForm.jsx` (892 lines) and `EditCarForm.jsx` (744 lines) that
 * were near-copies, so a field added to one silently went missing from the
 * other. The only difference that actually matters is which action runs on
 * submit, which is a two-line branch.
 */
export function CarForm({ car }: CarFormProps) {
  const router = useRouter();
  const t = React.useMemo(() => createTranslator("ar"), []);
  const isEdit = car !== undefined;

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema),
    defaultValues: car ? toCarFormValues(car) : emptyCarForm,
  });

  const images = watch("images");

  const onSuccess = React.useCallback(() => router.push(routes.admin.cars), [router]);

  const create = useAction(createCarAction, { onSuccess, successKey: "admin.cars.created" });
  const update = useAction(updateCarAction, { onSuccess, successKey: "admin.cars.updated" });

  const active = isEdit ? update : create;

  async function onSubmit(values: CarFormValues) {
    const payload = toCarPayload(values);
    const result = isEdit
      ? await update.execute(car.id, payload)
      : await create.execute(payload);

    // Server-side validation is authoritative — surface its field errors on the
    // matching inputs rather than only as a toast.
    if (!result.ok && result.error.fieldErrors) {
      for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
        const message = messages[0];
        if (message) {
          setError(field as FieldPath<CarFormValues>, { message: t(message) });
        }
      }
    }
  }

  /** Translates a Zod message key; falls back to the raw text if it is not a key. */
  const errorText = (field: keyof CarFormValues): string | undefined => {
    const message = errors[field]?.message;
    return message ? t(String(message)) : undefined;
  };

  const textField = (
    field: keyof CarFormValues,
    labelKey: string,
    type: "text" | "number" | "url" = "text",
  ) => (
    <div>
      <label htmlFor={field} className="mb-1 block text-sm font-medium">
        {t(labelKey)}
      </label>
      <Input id={field} type={type} error={errorText(field)} {...register(field)} />
    </div>
  );

  const checkboxField = (field: keyof CarFormValues, labelKey: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-[hsl(var(--brand))]" {...register(field)} />
      {t(labelKey)}
    </label>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{t(isEdit ? "admin.cars.edit" : "admin.cars.create")}</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {textField("make", "cars.fields.make")}
          {textField("model", "cars.fields.model")}
          {textField("year", "cars.fields.year", "number")}
          {textField("price", "cars.fields.price", "number")}
          {textField("mileage", "cars.fields.mileage", "number")}
          {textField("color", "cars.fields.color")}
          {textField("fuelType", "cars.fields.fuelType")}
          {textField("transmission", "cars.fields.transmission")}
          {textField("bodyType", "cars.fields.bodyType")}
          {textField("category", "cars.fields.category")}
          {textField("driveType", "cars.fields.driveType")}
          {textField("seats", "cars.fields.seats", "number")}
          {textField("videoUrl", "cars.fields.videoUrl", "url")}

          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium">
              {t("cars.fields.status")}
            </label>
            <Select
              id="status"
              options={STATUS_OPTIONS.map((value) => ({
                value,
                label: t(`cars.status.${value}`),
              }))}
              {...register("status")}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="description" className="mb-1 block text-sm font-medium">
              {t("cars.fields.description")}
            </label>
            <textarea
              id="description"
              rows={5}
              className="w-full rounded-md border border-input bg-surface p-3 text-sm"
              {...register("description")}
            />
            {errorText("description") ? (
              <p role="alert" className="mt-1 text-xs text-danger">
                {errorText("description")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-5 sm:col-span-2 lg:col-span-3">
            {checkboxField("featured", "cars.fields.featured")}
            {checkboxField("testDriveAvailable", "cars.fields.testDriveAvailable")}
            {checkboxField("isLuxury", "cars.filters.luxury")}
            {checkboxField("isEconomic", "cars.filters.economic")}
            {checkboxField("isCommercial", "cars.filters.commercial")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("cars.fields.images")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Images are uploaded to Supabase Storage from the browser and only
              their URLs are submitted, which is why the server action body
              limit can stay at 2 MB instead of v1's 1 GB. */}
          <ImageUrlList
            urls={images}
            onChange={(next) => setValue("images", next, { shouldValidate: true })}
            addLabel={t("common.create")}
            removeLabel={t("common.delete")}
          />
          {errorText("images") ? (
            <p role="alert" className="text-xs text-danger">
              {errorText("images")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" isLoading={active.isPending}>
          {t("common.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

interface ImageUrlListProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  addLabel: string;
  removeLabel: string;
}

/** Minimal URL list. Swap for a dropzone that uploads to Storage and appends
 *  the returned public URL — the contract it hands the form stays the same. */
function ImageUrlList({ urls, onChange, addLabel, removeLabel }: ImageUrlListProps) {
  const [draft, setDraft] = React.useState("");

  function add() {
    const value = draft.trim();
    if (!value || urls.includes(value)) return;
    onChange([...urls, value]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="https://…"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add}>
          {addLabel}
        </Button>
      </div>

      <ul className="space-y-1">
        {urls.map((url) => (
          <li
            key={url}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="truncate" dir="ltr">
              {url}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(urls.filter((item) => item !== url))}
            >
              {removeLabel}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
