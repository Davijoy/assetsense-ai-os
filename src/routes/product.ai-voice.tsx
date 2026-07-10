import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import {
  PhoneCall,
  ClipboardCheck,
  CalendarClock,
  Repeat,
  Megaphone,
  BarChart3,
  Mic,
  HeartPulse,
  Languages,
} from "lucide-react";

export const Route = createFileRoute("/product/ai-voice")({
  head: () => ({
    meta: [
      { title: "Sentinel AI Voice — Always-on Voice Agents" },
      { name: "description", content: "Human-like AI voice agents for qualification, appointments, follow-ups and campaigns — with analytics and sentiment." },
      { property: "og:title", content: "Sentinel AI Voice" },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  return (
    <ProductPage
      eyebrow="Product · AI Voice"
      title={<>Human-like voice agents, <span className="text-primary">always on</span>.</>}
      tagline="Voice-first sales & service"
      lead="Sentinel AI Voice runs qualification, appointment setting, follow-ups and outbound campaigns with lifelike agents — recorded, analysed and compliant."
      highlights={["Multilingual", "Sentiment aware", "TRAI/DND aware", "CRM native"]}
      features={[
        { icon: PhoneCall, title: "AI Calling Agent", description: "Realistic voice agents that place and receive calls with sub-second latency." },
        { icon: ClipboardCheck, title: "Lead Qualification", description: "Structured discovery with dynamic scripts and CRM field updates in real time." },
        { icon: CalendarClock, title: "Appointment Scheduling", description: "Books site visits and meetings into agent calendars with confirmations." },
        { icon: Repeat, title: "Follow-up Calls", description: "Automated cadences on missed calls, no-shows and pending decisions." },
        { icon: Megaphone, title: "Campaign Calls", description: "Broadcast campaigns for launches, offers and re-engagement at scale." },
        { icon: BarChart3, title: "Voice Analytics", description: "Talk-time, silence, objections, keywords and outcome analytics per agent." },
        { icon: Mic, title: "Call Recording", description: "Encrypted recordings with transcripts, redaction and compliance retention." },
        { icon: HeartPulse, title: "Sentiment Analysis", description: "Live and post-call sentiment scoring with escalation triggers." },
        { icon: Languages, title: "Multilingual Support", description: "English, Hindi, Tamil, Telugu, Kannada, Marathi, Bengali and more." },
      ]}
      workflow={{
        title: "Voice workflow",
        steps: [
          { title: "Trigger", description: "New lead, missed call or campaign event fires a voice job." },
          { title: "Converse", description: "AI agent runs dynamic script with objection handling." },
          { title: "Update CRM", description: "Fields, stage, notes and tasks update in real time." },
          { title: "Escalate", description: "Hot leads and negative sentiment route to human agents instantly." },
        ],
      }}
    />
  );
}