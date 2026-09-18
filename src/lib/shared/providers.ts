/**
 * Provider-Neutral Interfaces — abstract contracts for external services.
 *
 * If a provider is not configured, return NOT_CONFIGURED.
 * Do not create mock successful production responses.
 * All API keys remain server-side.
 */

export const NOT_CONFIGURED = Symbol("NOT_CONFIGURED");

export type NotConfigured = typeof NOT_CONFIGURED;

/**
 * Calendar Provider — abstracts calendar operations (Google, Outlook, CalDAV, etc.)
 */
export interface ICalendarProvider {
  /** Provider identifier */
  readonly providerId: string;
  /** Human-readable name */
  readonly name: string;

  /** Check if provider is configured and ready */
  isConfigured(): boolean;

  /** Create a calendar event */
  createEvent(params: CalendarEventParams): Promise<CalendarEventResult | NotConfigured>;

  /** Update an existing calendar event */
  updateEvent(eventId: string, params: Partial<CalendarEventParams>): Promise<CalendarEventResult | NotConfigured>;

  /** Delete a calendar event */
  deleteEvent(eventId: string): Promise<boolean | NotConfigured>;

  /** List events in a time range */
  listEvents(params: CalendarListParams): Promise<CalendarEvent[] | NotConfigured>;

  /** Get availability/free-busy for a time range */
  getAvailability(params: AvailabilityParams): Promise<AvailabilitySlot[] | NotConfigured>;
}

export interface CalendarEventParams {
  title: string;
  description?: string;
  startTime: string; // ISO 8601 UTC
  endTime: string; // ISO 8601 UTC
  timezone: string; // IANA timezone
  attendees?: Array<{ email: string; name?: string; required?: boolean }>;
  location?: string;
  meetingLink?: string;
  metadata?: Record<string, unknown>;
}

export interface CalendarEventResult {
  eventId: string;
  meetingLink?: string;
  createdAt: string;
}

export interface CalendarEvent {
  eventId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  attendees?: Array<{ email: string; name?: string; required?: boolean }>;
  location?: string;
  meetingLink?: string;
  status: "confirmed" | "tentative" | "cancelled";
  metadata?: Record<string, unknown>;
}

export interface CalendarListParams {
  startTime: string;
  endTime: string;
  timezone: string;
  maxResults?: number;
}

export interface AvailabilityParams {
  startTime: string;
  endTime: string;
  timezone: string;
  attendees?: string[];
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

/**
 * Location Provider — abstracts geolocation/geocoding (Google Maps, Mapbox, OpenStreetMap, etc.)
 */
export interface ILocationProvider {
  /** Provider identifier */
  readonly providerId: string;
  /** Human-readable name */
  readonly name: string;

  /** Check if provider is configured and ready */
  isConfigured(): boolean;

  /** Reverse geocode: coordinates -> address */
  reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | NotConfigured>;

  /** Forward geocode: address -> coordinates */
  geocode(address: string): Promise<GeocodeResult | NotConfigured>;

  /** Autocomplete suggestions for address input */
  autocomplete(input: string, sessionToken?: string): Promise<AutocompleteResult[] | NotConfigured>;

  /** Get place details by place ID */
  getPlaceDetails(placeId: string): Promise<PlaceDetails | NotConfigured>;

  /** Calculate distance/duration between points */
  getDistanceMatrix(origins: Coordinate[], destinations: Coordinate[]): Promise<DistanceMatrixResult | NotConfigured>;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  components?: AddressComponents;
  confidence?: number;
}

export interface AddressComponents {
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string; // state/province
  administrativeAreaLevel2?: string; // district
  country?: string;
  postalCode?: string;
}

export interface AutocompleteResult {
  placeId: string;
  description: string;
  structuredFormatting?: {
    mainText: string;
    secondaryText: string;
  };
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  types: string[];
  phoneNumber?: string;
  website?: string;
  openingHours?: string[];
  rating?: number;
  photos?: string[];
}

export interface DistanceMatrixResult {
  origins: Coordinate[];
  destinations: Coordinate[];
  rows: Array<{
    elements: Array<{
      distance: { value: number; text: string }; // meters
      duration: { value: number; text: string }; // seconds
      status: "OK" | "NOT_FOUND" | "ZERO_RESULTS";
    }>;
  }>;
}

/**
 * LLM Provider — abstracts language model operations (Claude, OpenAI, local, etc.)
 */
export interface ILLMProvider {
  /** Provider identifier */
  readonly providerId: string;
  /** Human-readable name */
  readonly name: string;
  /** Model identifier (e.g., "claude-3-5-sonnet-20241022") */
  readonly model: string;

  /** Check if provider is configured and ready */
  isConfigured(): boolean;

  /** Generate completion from messages */
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult | NotConfigured>;

  /** Stream completion */
  streamComplete(params: LLMCompletionParams): AsyncIterable<LLMStreamChunk | NotConfigured>;

  /** Count tokens for a prompt */
  countTokens(messages: LLMMessage[]): Promise<number | NotConfigured>;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: LLMToolCall[];
  toolCallId?: string;
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMCompletionParams {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: LLMTool[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  metadata?: Record<string, unknown>;
}

export interface LLMTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface LLMCompletionResult {
  content: string;
  toolCalls?: LLMToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: "stop" | "length" | "tool_calls" | "content_filter";
}

export interface LLMStreamChunk {
  content: string;
  toolCalls?: LLMToolCall[];
  finishReason?: "stop" | "length" | "tool_calls" | "content_filter";
}

/**
 * Telephony Provider — abstracts voice calling (Twilio, Plivo, Vonage, SIP, etc.)
 */
export interface ITelephonyProvider {
  /** Provider identifier */
  readonly providerId: string;
  /** Human-readable name */
  readonly name: string;

  /** Check if provider is configured and ready */
  isConfigured(): boolean;

  /** Initiate an outbound call */
  makeCall(params: CallParams): Promise<CallResult | NotConfigured>;

  /** Answer an incoming call (webhook handler) */
  handleIncomingCall(webhookData: unknown): Promise<CallControlResponse | NotConfigured>;

  /** Get call status */
  getCallStatus(callId: string): Promise<CallStatus | NotConfigured>;

  /** End a call */
  endCall(callId: string): Promise<boolean | NotConfigured>;

  /** Record a call */
  startRecording(callId: string): Promise<RecordingResult | NotConfigured>;
  stopRecording(callId: string): Promise<RecordingResult | NotConfigured>;

  /** Generate TwiML/XML for call control */
  generateCallControl(response: CallControlResponse): string;
}

export interface CallParams {
  to: string; // E.164 format
  from: string; // E.164 format
  webhookUrl: string; // Status callback URL
  recordingEnabled?: boolean;
  recordingChannels?: "mono" | "dual";
  timeout?: number; // seconds
  metadata?: Record<string, unknown>;
}

export interface CallResult {
  callId: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed" | "busy" | "no-answer";
  createdAt: string;
}

export interface CallStatus {
  callId: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed" | "busy" | "no-answer";
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  startTime?: string;
  endTime?: string;
  duration?: number; // seconds
  recordingUrl?: string;
  price?: number;
  priceUnit?: string;
}

export interface CallControlResponse {
  action: "say" | "play" | "gather" | "record" | "dial" | "hangup" | "redirect" | "pause";
  text?: string; // for say
  url?: string; // for play/record
  language?: string;
  voice?: string;
  loop?: number;
  gather?: {
    input: "dtmf" | "speech" | "dtmf speech";
    action: string;
    method?: "POST" | "GET";
    timeout?: number;
    numDigits?: number;
    finishOnKey?: string;
    speechTimeout?: "auto" | number;
    language?: string;
    hints?: string[];
  };
  dial?: {
    number: string;
    callerId?: string;
    timeout?: number;
    record?: boolean;
    recordingChannels?: "mono" | "dual";
  };
}

export interface RecordingResult {
  recordingId: string;
  callId: string;
  status: "in-progress" | "completed" | "failed";
  url?: string;
  duration?: number;
  channels?: number;
  startTime: string;
  endTime?: string;
}

/**
 * Speech-to-Text Provider — abstracts STT (Google, Azure, AWS, Whisper, Deepgram, etc.)
 */
export interface ISpeechToTextProvider {
  /** Provider identifier */
  readonly providerId: string;
  /** Human-readable name */
  readonly name: string;

  /** Check if provider is configured and ready */
  isConfigured(): boolean;

  /** Transcribe audio file/stream */
  transcribe(params: STTParams): Promise<STTResult | NotConfigured>;

  /** Stream transcription (real-time) */
  streamTranscribe(params: STTStreamParams): AsyncIterable<STTStreamResult | NotConfigured>;
}

export interface STTParams {
  audio: Buffer | ReadableStream | string; // Buffer, stream, or URL
  language?: string; // BCP-47 (e.g., "en-IN", "hi-IN")
  model?: string;
  enableDiarization?: boolean;
  enablePunctuation?: boolean;
  enableProfanityFilter?: boolean;
  metadata?: Record<string, unknown>;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  language: string;
  duration: number; // seconds
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
    speaker?: number;
  }>;
  segments?: Array<{
    transcript: string;
    startTime: number;
    endTime: number;
    confidence: number;
    speaker?: number;
  }>;
}

export interface STTStreamParams {
  audioStream: ReadableStream;
  language?: string;
  model?: string;
  interimResults?: boolean;
  metadata?: Record<string, unknown>;
}

export interface STTStreamResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  startTime: number;
  endTime: number;
  speaker?: number;
}

/**
 * Text-to-Speech Provider — abstracts TTS (Google, Azure, AWS, ElevenLabs, etc.)
 */
export interface ITextToSpeechProvider {
  /** Provider identifier */
  readonly providerId: string;
  /** Human-readable name */
  readonly name: string;

  /** Check if provider is configured and ready */
  isConfigured(): boolean;

  /** Synthesize speech */
  synthesize(params: TTSParams): Promise<TTSResult | NotConfigured>;

  /** Stream synthesis */
  streamSynthesize(params: TTSParams): AsyncIterable<TTSStreamResult | NotConfigured>;

  /** List available voices */
  listVoices(): Promise<TTSVoice[] | NotConfigured>;
}

export interface TTSParams {
  text: string;
  voice?: string; // voice ID/name
  language?: string; // BCP-47
  speakingRate?: number; // 0.25 - 4.0
  pitch?: number; // -20.0 - 20.0
  volumeGainDb?: number; // -96.0 - 16.0
  audioEncoding?: "MP3" | "LINEAR16" | "OGG_OPUS" | "MULAW";
  metadata?: Record<string, unknown>;
}

export interface TTSResult {
  audioContent: Buffer | Uint8Array;
  audioEncoding: string;
  duration: number; // estimated seconds
}

export interface TTSStreamResult {
  audioChunk: Uint8Array;
  isFinal: boolean;
}

export interface TTSVoice {
  voiceId: string;
  name: string;
  language: string;
  gender?: "MALE" | "FEMALE" | "NEUTRAL";
  naturalSampleRateHertz?: number;
  previewUrl?: string;
}

/**
 * Provider Registry — central registry for all configured providers
 */
export interface ProviderRegistry {
  calendar: ICalendarProvider | null;
  location: ILocationProvider | null;
  llm: ILLMProvider | null;
  telephony: ITelephonyProvider | null;
  speechToText: ISpeechToTextProvider | null;
  textToSpeech: ITextToSpeechProvider | null;
}

/**
 * Creates an empty provider registry (all providers return NOT_CONFIGURED)
 */
export function createEmptyProviderRegistry(): ProviderRegistry {
  return {
    calendar: null,
    location: null,
    llm: null,
    telephony: null,
    speechToText: null,
    textToSpeech: null,
  };
}

/**
 * Helper to check if a provider is configured
 */
export function isProviderConfigured<T extends { isConfigured(): boolean }>(provider: T | null): provider is T {
  return provider !== null && provider.isConfigured();
}

/**
 * Helper to safely call a provider method, returning NOT_CONFIGURED if not available
 */
export async function callProvider<T extends Record<string, unknown>, R>(
  provider: T | null,
  method: keyof T,
  ...args: unknown[]
): Promise<R | NotConfigured> {
  if (!provider || typeof provider[method] !== "function") {
    return NOT_CONFIGURED;
  }
  const fn = provider[method] as (...args: unknown[]) => Promise<R>;
  return fn(...args);
}
