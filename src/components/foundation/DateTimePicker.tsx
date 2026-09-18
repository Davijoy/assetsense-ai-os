/**
 * Calendar, Clock & Location Foundation — reusable UI components.
 *
 * - Date picker
 * - Time picker
 * - Timezone-aware display
 * - Server timestamp display
 * - Optional location capture
 * - Address/location label
 * - Provider-neutral map/location adapter (no hardcoded Google Maps)
 */

import { useState, useCallback, useEffect } from "react";
import { Calendar, Clock, MapPin, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { NOT_CONFIGURED, type ILocationProvider, type GeocodeResult } from "@/lib/shared/providers";

/** IANA timezone list (common ones) */
export const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/Toronto",
  "America/Sao_Paulo",
] as const;

export type Timezone = (typeof COMMON_TIMEZONES)[number] | string;

/** Date picker props */
export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

/** Time picker props */
export interface TimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  stepMinutes?: number;
  className?: string;
}

/** DateTime picker props (combined) */
export interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  showTimezone?: boolean;
  timezone?: Timezone;
  onTimezoneChange?: (tz: Timezone) => void;
  className?: string;
}

/** Server timestamp display props */
export interface ServerTimestampDisplayProps {
  timestamp: string; // ISO 8601 UTC
  showTimezone?: boolean;
  timezone?: Timezone;
  format?: "relative" | "absolute" | "both";
  className?: string;
}

/** Location capture props */
export interface LocationCaptureProps {
  onLocationCapture: (result: LocationCaptureResult) => void;
  provider?: ILocationProvider | null;
  placeholder?: string;
  disabled?: boolean;
  requirePermission?: boolean;
  className?: string;
}

export interface LocationCaptureResult {
  latitude: number;
  longitude: number;
  address: string;
  placeId?: string;
  components?: GeocodeResult["components"];
  capturedAt: string; // ISO 8601 UTC
  source: "gps" | "manual" | "autocomplete";
}

/** Timezone-aware date/time display */
export interface TimezoneAwareDisplayProps {
  dateTime: string; // ISO 8601 UTC
  targetTimezone: Timezone;
  format?: "short" | "long" | "time-only" | "date-only";
  showTimezoneLabel?: boolean;
  className?: string;
}

/**
 * Date Picker Component
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  minDate,
  maxDate,
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<Date | undefined>(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = useCallback((date: Date | undefined) => {
    setInternalValue(date);
    onChange(date);
    setOpen(false);
  }, [onChange]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const min = minDate ?? new Date(1900, 0, 1);
  const max = maxDate ?? new Date(2100, 11, 31);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left ${className}`}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {internalValue ? internalValue.toLocaleDateString() : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4 min-w-[280px]">
          <div className="flex items-center justify-between">
            <span className="font-medium">Select Date</span>
            <Button variant="ghost" size="icon" onClick={() => handleChange(today)}>
              Today
            </Button>
          </div>
          <input
            type="date"
            value={internalValue ? internalValue.toISOString().split("T")[0] : ""}
            onChange={(e) => handleChange(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)}
            min={min.toISOString().split("T")[0]}
            max={max.toISOString().split("T")[0]}
            disabled={disabled}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => handleChange(undefined)}>
              Clear
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Time Picker Component
 */
export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
  stepMinutes = 15,
  className = "",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<Date | undefined>(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = useCallback((date: Date | undefined) => {
    setInternalValue(date);
    onChange(date);
    setOpen(false);
  }, [onChange]);

  const generateTimeOptions = () => {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += stepMinutes) {
        const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        options.push(time);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();
  const currentTime = internalValue ? internalValue.toTimeString().slice(0, 5) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left ${className}`}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {currentTime || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 max-h-96" align="start">
        <div className="p-4 space-y-4 min-w-[200px]">
          <div className="flex items-center justify-between">
            <span className="font-medium">Select Time</span>
            <Button variant="ghost" size="icon" onClick={() => handleChange(new Date())}>
              Now
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {timeOptions.map((time) => (
              <Button
                key={time}
                variant={currentTime === time ? "default" : "ghost"}
                className="w-full justify-start text-sm"
                onClick={() => {
                  const [hours, minutes] = time.split(":").map(Number);
                  const date = internalValue ?? new Date();
                  date.setHours(hours, minutes, 0, 0);
                  handleChange(date);
                }}
              >
                {time}
              </Button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => handleChange(undefined)}>
              Clear
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Combined DateTime Picker
 */
export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  disabled = false,
  showTimezone = true,
  timezone = "UTC",
  onTimezoneChange,
  className = "",
}: DateTimePickerProps) {
  const [dateValue, setDateValue] = useState<Date | undefined>(value);
  const [timeValue, setTimeValue] = useState<Date | undefined>(value);
  const [tz, setTz] = useState<Timezone>(timezone);

  useEffect(() => {
    if (value) {
      setDateValue(value);
      setTimeValue(value);
    } else {
      setDateValue(undefined);
      setTimeValue(undefined);
    }
  }, [value]);

  useEffect(() => {
    setTz(timezone);
  }, [timezone]);

  const combineDateTime = useCallback(() => {
    if (!dateValue) return undefined;
    const combined = new Date(dateValue);
    if (timeValue) {
      combined.setHours(timeValue.getHours(), timeValue.getMinutes(), timeValue.getSeconds(), timeValue.getMilliseconds());
    }
    return combined;
  }, [dateValue, timeValue]);

  const handleDateChange = useCallback((date: Date | undefined) => {
    setDateValue(date);
    onChange(combineDateTime());
  }, [onChange, combineDateTime]);

  const handleTimeChange = useCallback((date: Date | undefined) => {
    setTimeValue(date);
    onChange(combineDateTime());
  }, [onChange, combineDateTime]);

  const handleTimezoneChange = useCallback((newTz: Timezone) => {
    setTz(newTz);
    onTimezoneChange?.(newTz);
  }, [onTimezoneChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <DatePicker value={dateValue} onChange={handleDateChange} placeholder="Date" disabled={disabled} />
        <TimePicker value={timeValue} onChange={handleTimeChange} placeholder="Time" disabled={disabled} />
      </div>
      {showTimezone && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label htmlFor="timezone" className="text-xs text-muted-foreground">
              Timezone
            </Label>
            <select
              id="timezone"
              value={tz}
              onChange={(e) => handleTimezoneChange(e.target.value as Timezone)}
              disabled={disabled}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {COMMON_TIMEZONES.map((tzOption) => (
                <option key={tzOption} value={tzOption}>
                  {tzOption}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Server Timestamp Display — shows server-authoritative timestamp
 */
export function ServerTimestampDisplay({
  timestamp,
  showTimezone = true,
  timezone = "UTC",
  format = "both",
  className = "",
}: ServerTimestampDisplayProps) {
  const date = new Date(timestamp);
  const isValid = !isNaN(date.getTime());

  if (!isValid) {
    return (
      <span className={`text-destructive flex items-center gap-1 ${className}`}>
        <AlertCircle className="h-3 w-3" />
        Invalid timestamp
      </span>
    );
  }

  const utcString = date.toISOString();
  const localString = date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  });
  const relativeString = formatRelativeTime(date);

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {format === "absolute" || format === "both" ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs text-muted-foreground">UTC:</span>
          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{utcString}</code>
          {showTimezone && (
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
              {timezone}
            </span>
          )}
        </div>
      ) : null}
      {format === "relative" || format === "both" ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs text-muted-foreground">Local:</span>
          <span className="font-mono text-xs">{localString}</span>
          {showTimezone && (
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
              {timezone}
            </span>
          )}
        </div>
      ) : null}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{relativeString}</span>
        <CheckCircle className="h-3 w-3 text-primary" aria-label="Server-authoritative timestamp" />
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Location Capture Component — provider-neutral
 */
export function LocationCapture({
  onLocationCapture,
  provider = null,
  placeholder = "Enter address or use current location",
  disabled = false,
  requirePermission = true,
  className = "",
}: LocationCaptureProps) {
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"gps" | "manual" | "autocomplete">("manual");

  const handleGeocode = useCallback(async (inputAddress: string) => {
    if (!provider) {
      setError("Location provider not configured");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await provider.geocode(inputAddress);
      if (result === NOT_CONFIGURED) {
        setError("Location provider not configured");
        return;
      }

      setCoordinates({ lat: result.latitude, lng: result.longitude });
      setLocationLabel(result.formattedAddress);
      setSource("autocomplete");

      onLocationCapture({
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.formattedAddress,
        placeId: result.placeId,
        components: result.components,
        capturedAt: new Date().toISOString(),
        source: "autocomplete",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geocoding failed");
    } finally {
      setLoading(false);
    }
  }, [provider, onLocationCapture]);

  const handleReverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!provider) {
      setError("Location provider not configured");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await provider.reverseGeocode(lat, lng);
      if (result === NOT_CONFIGURED) {
        setError("Location provider not configured");
        return;
      }

      setAddress(result.formattedAddress);
      setLocationLabel(result.formattedAddress);
      setSource("gps");

      onLocationCapture({
        latitude: lat,
        longitude: lng,
        address: result.formattedAddress,
        placeId: result.placeId,
        components: result.components,
        capturedAt: new Date().toISOString(),
        source: "gps",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reverse geocoding failed");
    } finally {
      setLoading(false);
    }
  }, [provider, onLocationCapture]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser");
      return;
    }

    if (requirePermission) {
      // Browser will prompt for permission
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        handleReverseGeocode(latitude, longitude);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [handleReverseGeocode, requirePermission]);

  const handleManualSubmit = useCallback(() => {
    if (!address.trim()) {
      setError("Please enter an address");
      return;
    }
    handleGeocode(address);
  }, [address, handleGeocode]);

  const hasLocation = coordinates !== null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Location</Label>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
          disabled={disabled || loading}
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={handleManualSubmit}
          disabled={disabled || loading || !address.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
        <Button
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={disabled || loading}
        >
          <MapPin className="h-4 w-4" />
          <span className="sr-only">Use current location</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {hasLocation && (
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium truncate">{locationLabel || address}</span>
                <span className="text-xs text-muted-foreground capitalize">{source}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground font-mono">
                {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => {
              setCoordinates(null);
              setLocationLabel("");
              setAddress("");
            }}>
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Timezone-Aware Display — shows date/time in target timezone
 */
export function TimezoneAwareDisplay({
  dateTime,
  targetTimezone,
  format = "short",
  showTimezoneLabel = true,
  className = "",
}: TimezoneAwareDisplayProps) {
  const date = new Date(dateTime);
  const isValid = !isNaN(date.getTime());

  if (!isValid) {
    return <span className={`text-destructive ${className}`}>Invalid date</span>;
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: targetTimezone,
  };

  switch (format) {
    case "short":
      formatOptions.dateStyle = "short";
      formatOptions.timeStyle = "short";
      break;
    case "long":
      formatOptions.dateStyle = "full";
      formatOptions.timeStyle = "long";
      break;
    case "time-only":
      formatOptions.timeStyle = "medium";
      break;
    case "date-only":
      formatOptions.dateStyle = "medium";
      break;
  }

  const formatted = date.toLocaleString(undefined, formatOptions);

  return (
    <span className={className}>
      {formatted}
      {showTimezoneLabel && (
        <span className="ml-1 text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
          {targetTimezone}
        </span>
      )}
    </span>
  );
}