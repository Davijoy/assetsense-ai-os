import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  MessageSquare,
  Send,
  Users,
  Shield,
  Headphones,
  Sparkles,
  Search,
  CheckCheck,
  Building,
  UserCheck,
  Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/messages")({
  head: () => ({ meta: [{ title: "Workspace Messaging — Sentinel Fort" }] }),
  component: WorkspaceMessagesRoute,
});

interface MessageItem {
  id: string;
  sender: string;
  role: string;
  content: string;
  timestamp: string;
  channelId: string;
  isSelf?: boolean;
}

interface ChannelItem {
  id: string;
  name: string;
  category: "team" | "executive" | "support" | "investor";
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  icon: any;
}

export function WorkspaceMessagesRoute() {
  const { user, profile } = useAuth();
  const [activeChannelId, setActiveChannelId] = useState<string>("ch_general");
  const [inputText, setInputText] = useState("");

  const [channels] = useState<ChannelItem[]>([
    {
      id: "ch_general",
      name: "Workspace Announcements",
      category: "team",
      unreadCount: 1,
      lastMessage: "Q3 portfolio review scheduled for tomorrow at 11 AM.",
      lastMessageTime: "10:45 AM",
      icon: Building,
    },
    {
      id: "ch_exec",
      name: "Executive Strategy Group",
      category: "executive",
      unreadCount: 0,
      lastMessage: "Supreme Intelligence valuation model approved for Whitefield units.",
      lastMessageTime: "Yesterday",
      icon: Shield,
    },
    {
      id: "ch_sales",
      name: "Investor & Sales Operations",
      category: "investor",
      unreadCount: 3,
      lastMessage: "3 new high-net-worth investor inquiries routed to sales queue.",
      lastMessageTime: "11:20 AM",
      icon: Users,
    },
    {
      id: "ch_support",
      name: "Dedicated Platform Support",
      category: "support",
      unreadCount: 0,
      lastMessage: "System operational. All 4 domain connectors synchronized.",
      lastMessageTime: "Aug 30",
      icon: Headphones,
    },
  ]);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "msg_1",
      sender: "Aarav Mehta",
      role: "Sales Executive",
      content: "Welcome to the unified workspace communications hub. All internal messages and investor threads are scoped to this verified workspace.",
      timestamp: "09:30 AM",
      channelId: "ch_general",
    },
    {
      id: "msg_2",
      sender: "Priya Sharma",
      role: "Platform Administrator",
      content: "Please ensure all investor follow-up logs are recorded for Supreme Intelligence outcome learning.",
      timestamp: "10:15 AM",
      channelId: "ch_general",
    },
    {
      id: "msg_3",
      sender: "Vikram Malhotra",
      role: "Developer / Builder",
      content: "Tower B floor plans and pricing schedule have been published to the inventory registry.",
      timestamp: "11:00 AM",
      channelId: "ch_general",
    },
    {
      id: "msg_4",
      sender: "Supreme Executive Monitor",
      role: "System",
      content: "Executive alert: High investor demand detected for 3BHK configurations in North Corridor.",
      timestamp: "Yesterday",
      channelId: "ch_exec",
    },
    {
      id: "msg_5",
      sender: "Lead Ingestion Gateway",
      role: "System",
      content: "3 new investor inquiries allocated to active sales executives.",
      timestamp: "11:20 AM",
      channelId: "ch_sales",
    },
    {
      id: "msg_6",
      sender: "Sentinel Support Desk",
      role: "Support Team",
      content: "Hi there! How can we assist your workspace team today?",
      timestamp: "Aug 30",
      channelId: "ch_support",
    },
  ]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const channelMessages = messages.filter((m) => m.channelId === activeChannelId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: MessageItem = {
      id: `msg_${Date.now()}`,
      sender: profile?.full_name || user?.email?.split("@")[0] || "Current User",
      role: "Workspace Member",
      content: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      channelId: activeChannelId,
      isSelf: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#FDFBF7]">
      {/* ── Channels Sidebar ── */}
      <aside className="w-80 border-r border-[#EBE3D3] bg-white flex flex-col">
        <div className="p-4 border-b border-[#EBE3D3]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-stone-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#B89635]" />
              <span>Workspace Messaging</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF5E8] text-[#B89635] border border-[#E9DFC9]">
              WORKSPACE
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Internal communication & direct channels
          </p>
        </div>

        <div className="p-3 border-b border-stone-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-hidden focus:border-[#B89635]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = channel.id === activeChannelId;
            return (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors flex items-start gap-3 ${
                  isSelected
                    ? "bg-[#FAF5E8] border border-[#E8DEC7] text-stone-900 shadow-2xs"
                    : "hover:bg-stone-50 text-stone-700 border border-transparent"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-[#B89635] text-white" : "bg-stone-100 text-stone-600"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{channel.name}</span>
                    <span className="text-[10px] text-stone-400">{channel.lastMessageTime}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">{channel.lastMessage}</p>
                </div>
                {channel.unreadCount > 0 && (
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#B89635] text-white">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-[#EBE3D3] bg-[#FCFAF5] text-[10px] text-stone-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-stone-400" />
            <span>End-to-End Workspace Scope</span>
          </span>
          <span className="font-bold text-emerald-700">ONLINE</span>
        </div>
      </aside>

      {/* ── Main Message Pane ── */}
      <section className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EBE3D3] flex items-center justify-between bg-white/80 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#FAF5E8] text-[#B89635]">
              <activeChannel.icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900">{activeChannel.name}</h1>
              <p className="text-[11px] text-stone-500">
                Connected with authorized workspace executives, developers & advisors
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded-md">
              Channel: {activeChannel.category.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FDFBF7]">
          <div className="text-center my-2">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider bg-stone-100/80 px-3 py-1 rounded-full">
              Today — Verified Workspace Log
            </span>
          </div>

          {channelMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-xs font-bold text-stone-800">{msg.sender}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-stone-100 text-stone-600 font-medium">
                  {msg.role}
                </span>
                <span className="text-[10px] text-stone-400">{msg.timestamp}</span>
              </div>
              <div
                className={`max-w-xl rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                  msg.isSelf
                    ? "bg-[#B89635] text-white rounded-tr-xs"
                    : "bg-white text-stone-800 border border-[#EBE3D3] rounded-tl-xs"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[#EBE3D3] bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message #${activeChannel.name}...`}
              className="flex-1 px-4 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#B89635] focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2 rounded-xl bg-[#B89635] text-white text-xs font-bold hover:bg-[#A38228] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </div>
          <div className="mt-2 text-[10px] text-stone-400 flex items-center justify-between">
            <span>Press Enter to send. Messages are preserved in the workspace audit record.</span>
            <span className="text-stone-500 font-medium">AI Voice is located in the companion voice channel.</span>
          </div>
        </form>
      </section>
    </div>
  );
}
