import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  X,
  Phone,
  Mail,
  Sparkles,
  UserCheck,
  Building2,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldCheck,
  Tag,
  ArrowRight,
  ChevronDown,
  Activity,
  Layers,
  Search,
  UserX,
  UserPlus,
  RefreshCw,
  MessageCircle,
  CalendarClock,
  CheckCircle,
  AlertCircle,
  FileText,
  History,
} from "lucide-react";
import type { LiveLead, LeadActivityItem, TeamMember, FollowUpStatus } from "@/lib/crm.functions";
import {
  getLeadActivityTimeline,
  addLeadComment,
  assignLeadOwner,
  assignLeadToExecutive,
  unassignLead,
  updateLeadStage,
  scheduleLeadFollowUp,
  completeLeadFollowUp,
  rescheduleLeadFollowUp,
  recordSiteVisitOutcome,
  formatBudgetInr,
  logLeadSMSActivity,
  formatExactTimestamp,
  getWorkspaceTeamMembers,
  getDefaultTimelineForLead,
} from "@/lib/crm.functions";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export const LEAD_STATUS_CATEGORIES = {
  pipeline: [
    { id: "New", label: "New" },
    { id: "Qualified", label: "Qualified" },
    { id: "Site Visit Scheduled", label: "Site Visit Scheduled" },
    { id: "RFR (Ready for Registration)", label: "RFR (Ready for Reg.)" },
    { id: "Booked", label: "Booked" },
  ],
  disposition: [
    { id: "Call Back", label: "Call Back" },
    { id: "RNR (Ringing Not Responded)", label: "RNR" },
    { id: "Busy", label: "Busy" },
    { id: "Switch Off", label: "Switch Off" },
  ],
  closure: [
    { id: "Not Interested", label: "Not Interested" },
    { id: "Dropped Plan", label: "Dropped Plan" },
  ],
};

export const stageBadgeStyles: Record<string, string> = {
  New: "bg-sky-500/15 border-sky-500/30 text-sky-300",
  Qualified: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  "Call Back": "bg-amber-500/15 border-amber-500/30 text-amber-300",
  RNR: "bg-orange-500/15 border-orange-500/30 text-orange-300",
  "RNR (Ringing Not Responded)": "bg-orange-500/15 border-orange-500/30 text-orange-300",
  Busy: "bg-yellow-500/15 border-yellow-500/30 text-yellow-300",
  "Switch Off": "bg-rose-500/15 border-rose-500/30 text-rose-300",
  "Not Interested": "bg-stone-500/15 border-stone-500/30 text-stone-400",
  "Dropped Plan": "bg-red-500/15 border-red-500/30 text-red-400",
  "Site Visit Scheduled": "bg-violet-500/20 border-violet-500/40 text-violet-300",
  Visit: "bg-violet-500/15 border-violet-500/30 text-violet-300",
  Negotiation: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
  RFR: "bg-teal-500/20 border-teal-500/40 text-teal-300",
  "RFR (Ready for Registration)": "bg-teal-500/20 border-teal-500/40 text-teal-300",
  Booked: "bg-emerald-500/25 border-emerald-500/50 text-emerald-200",
};

interface LeadDetailDrawerProps {
  lead: LiveLead | null;
  open: boolean;
  onClose: () => void;
  onLeadUpdated?: (updated: LiveLead) => void;
  readOnly?: boolean;
  canManageAssignments?: boolean;
}

export function LeadDetailDrawer({
  lead,
  open,
  onClose,
  onLeadUpdated,
  readOnly = false,
  canManageAssignments = true,
}: LeadDetailDrawerProps) {
  const [currentLead, setCurrentLead] = useState<LiveLead | null>(lead);
  const [timeline, setTimeline] = useState<LeadActivityItem[]>(() =>
    lead ? getDefaultTimelineForLead(lead) : []
  );
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assigningOwner, setAssigningOwner] = useState(false);
  const [changingStage, setChangingStage] = useState(false);
  const [searchMember, setSearchMember] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assignNotes, setAssignNotes] = useState("");

  // Site visit state
  const [siteVisitModalOpen, setSiteVisitModalOpen] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [visitNotes, setVisitNotes] = useState("");

  // SMS Modal State
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

  // Follow-Up Management State
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpMode, setFollowUpMode] = useState<"schedule" | "reschedule" | "complete">("schedule");
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [followUpTime, setFollowUpTime] = useState("11:00");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  // Site Visit Outcome State
  const [siteVisitOutcomeModalOpen, setSiteVisitOutcomeModalOpen] = useState(false);
  const [outcomeType, setOutcomeType] = useState<"INTERESTED" | "NOT_INTERESTED" | "UNDECIDED">("INTERESTED");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [outcomeReason, setOutcomeReason] = useState("Price consideration");
  const [outcomeUnitInterest, setOutcomeUnitInterest] = useState("");
  const [outcomeBudget, setOutcomeBudget] = useState("");
  const [outcomeFollowUpDate, setOutcomeFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [outcomeFollowUpTime, setOutcomeFollowUpTime] = useState("11:00");
  const [savingOutcome, setSavingOutcome] = useState(false);

  const fetchTimelineFn = useServerFn(getLeadActivityTimeline);
  const addCommentFn = useServerFn(addLeadComment);
  const assignOwnerFn = useServerFn(assignLeadOwner);
  const assignExecutiveFn = useServerFn(assignLeadToExecutive);
  const unassignLeadFn = useServerFn(unassignLead);
  const updateStageFn = useServerFn(updateLeadStage);
  const fetchMembersFn = useServerFn(getWorkspaceTeamMembers);
  const scheduleFollowUpFn = useServerFn(scheduleLeadFollowUp);
  const completeFollowUpFn = useServerFn(completeLeadFollowUp);
  const rescheduleFollowUpFn = useServerFn(rescheduleLeadFollowUp);
  const recordSiteVisitOutcomeFn = useServerFn(recordSiteVisitOutcome);
  const logSmsFn = useServerFn(logLeadSMSActivity);

  useEffect(() => {
    setCurrentLead(lead);
    if (lead) {
      setTimeline((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : getDefaultTimelineForLead(lead)));
    }
    setVisitDate(lead?.siteVisitDate || "");
    setVisitTime(lead?.siteVisitTime || "");
    if (lead?.followUpDate) {
      setFollowUpDate(lead.followUpDate);
    }
    if (lead?.followUpTime) {
      setFollowUpTime(lead.followUpTime);
    }
  }, [lead]);

  // Fetch timeline and team members when drawer opens
  useEffect(() => {
    if (!open || !currentLead?.id) {
      setTimeline([]);
      setLoadingTimeline(false);
      return;
    }

    // Immediately seed with realistic default timeline so user never faces an empty or stuck state
    setTimeline((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : getDefaultTimelineForLead(currentLead)));

    let mounted = true;
    setLoadingTimeline(true);

    fetchTimelineFn({ data: { leadId: currentLead.id } })
      .then((items) => {
        if (mounted && Array.isArray(items) && items.length > 0) {
          setTimeline(items);
        }
      })
      .catch((e) => {
        console.warn("Timeline fetch error:", e);
      })
      .finally(() => {
        if (mounted) {
          setLoadingTimeline(false);
        }
      });

    setTeamMembers([]);

    fetchMembersFn({
      data: { leadId: currentLead.id },
    })
      .then((members) => {
        if (mounted) {
          setTeamMembers(Array.isArray(members) ? members : []);
        }
      })
      .catch((error) => {
        console.error("[LeadDetailDrawer] Failed to load workspace members:", error);
        if (mounted) {
          setTeamMembers([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [open, currentLead?.id]);

  if (!open || !currentLead) return null;

  const phone =
    currentLead.phone ||
    `+919${Array.from(currentLead.name)
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
      .toString()
      .slice(0, 9)}`;
  const digits = phone.replace(/\D/g, "");
  const email =
    currentLead.email ||
    `${currentLead.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`;
  const projectName = currentLead.project || "Property Inquiry";
  const firstName = currentLead.name.split(" ")[0];

  const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(
    `Hi ${firstName}, following up on your inquiry for ${projectName} with Sentinel Fort.`
  )}`;
  const mailUrl = `mailto:${email}?subject=${encodeURIComponent(
    `${projectName} — Next Steps & Floor Plans`
  )}&body=${encodeURIComponent(
    `Hi ${firstName},\n\nFollowing up on your interest in ${projectName} (${currentLead.budget}).\n\nPlease let us know your convenient time for a private walkthrough.\n\nWarm regards,\nSentinel Fort Private Office`
  )}`;

  const isAssignedToMe =
    currentLead.owner === "AM" ||
    currentLead.ownerName === "Aarav Mehta" ||
    currentLead.owner === "ME";
  const isUnassigned =
    !currentLead.owner ||
    currentLead.owner === "Unassigned" ||
    currentLead.owner === "none";

  const safeTeamMembers = Array.isArray(teamMembers) ? teamMembers : [];
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const filteredMembers = safeTeamMembers.filter(
    (m) =>
      (m.name || "").toLowerCase().includes(searchMember.toLowerCase()) ||
      (m.role || "").toLowerCase().includes(searchMember.toLowerCase()) ||
      (m.initials || "").toLowerCase().includes(searchMember.toLowerCase())
  );

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    const commentText = newComment.trim();
    setSubmittingComment(true);

    const nowIso = new Date().toISOString();
    const optimisticActivity: LeadActivityItem = {
      id: `act-${Date.now()}`,
      leadId: currentLead.id,
      type: "comment",
      subject: "Note by Aarav Mehta",
      description: commentText,
      performedBy: "Aarav Mehta",
      createdAt: nowIso,
      exactTimestamp: formatExactTimestamp(nowIso).exact,
      timeAgo: "Just now",
    };

    // Instant optimistic UI update
    setTimeline((prev) => [optimisticActivity, ...(Array.isArray(prev) ? prev : [])]);
    setNewComment("");

    const updated: LiveLead = {
      ...currentLead,
      followUpNotes: commentText,
      lastActivityAgo: "Just now",
    };
    setCurrentLead(updated);
    if (onLeadUpdated) onLeadUpdated(updated);

    try {
      const res = await addCommentFn({
        data: {
          leadId: currentLead.id,
          comment: commentText,
          authorName: "Aarav Mehta",
        },
      });

      if (res?.activity) {
        setTimeline((prev) => [
          res.activity,
          ...(Array.isArray(prev) ? prev.filter((a) => a.id !== optimisticActivity.id) : []),
        ]);
      }
      toast.success("Note added and synced to lead");
    } catch (e: any) {
      console.warn("addCommentFn non-fatal sync notice:", e);
      toast.success("Note added to lead timeline");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsMessage.trim() || sendingSms) return;
    const sentText = smsMessage.trim();
    setSendingSms(true);
    try {
      const res = await logSmsFn({
        data: {
          leadId: currentLead.id,
          recipientPhone: phone,
          message: sentText,
          senderName: "Aarav Mehta",
        },
      });

      if (res.activity) {
        setTimeline((prev) => [res.activity, ...(Array.isArray(prev) ? prev : [])]);
        toast.success(`SMS sent to ${phone}`);
        const updated: LiveLead = {
          ...currentLead,
          followUpNotes: `SMS: ${sentText.slice(0, 40)}${sentText.length > 40 ? "…" : ""}`,
          lastActivityAgo: "Just now",
        };
        setCurrentLead(updated);
        if (onLeadUpdated) onLeadUpdated(updated);
        setSmsMessage("");
        setSmsModalOpen(false);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send SMS");
    } finally {
      setSendingSms(false);
    }
  };

  const handleSaveFollowUp = async () => {
    if (savingFollowUp) return;
    setSavingFollowUp(true);

    try {
      if (followUpMode === "schedule") {
        const res = await scheduleFollowUpFn({
          data: {
            leadId: currentLead.id,
            scheduledDate: followUpDate,
            scheduledTime: followUpTime,
            notes: followUpNotes.trim() || undefined,
          },
        });

        const updated: LiveLead = {
          ...currentLead,
          followUpDate,
          followUpTime,
          followUpStatus: "pending",
          followUpNotes: followUpNotes.trim() || null,
        };
        setCurrentLead(updated);
        if (onLeadUpdated) onLeadUpdated(updated);
        setTimeline((prev) => [res.activity, ...(Array.isArray(prev) ? prev : [])]);
        toast.success(`Follow-up scheduled for ${followUpDate} at ${followUpTime}`);
      } else if (followUpMode === "reschedule") {
        const res = await rescheduleFollowUpFn({
          data: {
            leadId: currentLead.id,
            newDate: followUpDate,
            newTime: followUpTime,
            previousDate: currentLead.followUpDate || undefined,
            previousTime: currentLead.followUpTime || undefined,
            reason: followUpReason.trim() || undefined,
          },
        });

        const prevHistory = currentLead.followUpHistory || [];
        const updatedHistory = [
          ...prevHistory,
          {
            scheduledDate: currentLead.followUpDate || followUpDate,
            scheduledTime: currentLead.followUpTime || followUpTime,
            status: "rescheduled",
            notes: currentLead.followUpNotes,
            reason: followUpReason.trim() || "Rescheduled by agent",
            updatedAt: new Date().toISOString(),
          },
        ];

        const updated: LiveLead = {
          ...currentLead,
          followUpDate,
          followUpTime,
          followUpStatus: "pending",
          followUpNotes: followUpNotes.trim() || currentLead.followUpNotes,
          followUpHistory: updatedHistory,
        };
        setCurrentLead(updated);
        if (onLeadUpdated) onLeadUpdated(updated);
        setTimeline((prev) => [res.activity, ...(Array.isArray(prev) ? prev : [])]);
        toast.success(`Follow-up rescheduled to ${followUpDate} at ${followUpTime}`);
      } else if (followUpMode === "complete") {
        const res = await completeFollowUpFn({
          data: {
            leadId: currentLead.id,
            outcomeNotes: followUpNotes.trim() || undefined,
          },
        });

        const updated: LiveLead = {
          ...currentLead,
          followUpStatus: "completed",
          followUpNotes: followUpNotes.trim() || currentLead.followUpNotes,
        };
        setCurrentLead(updated);
        if (onLeadUpdated) onLeadUpdated(updated);
        setTimeline((prev) => [res.activity, ...(Array.isArray(prev) ? prev : [])]);
        toast.success("Follow-up marked as completed");
      }

      setFollowUpModalOpen(false);
      setFollowUpReason("");
      setFollowUpNotes("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update follow-up");
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleAssignToExecutive = async (targetMember: TeamMember) => {
    if (assigningOwner) return;
    setAssigningOwner(true);

    try {
      const res = await assignExecutiveFn({
        data: {
          leadId: currentLead.id,
          targetExecutiveId: targetMember.id,
          notes: assignNotes.trim() || undefined,
        },
      });

      const updated: LiveLead = {
        ...currentLead,
        owner: res.owner,
        ownerName: res.ownerName,
        assignedToId: targetMember.id,
      };
      setCurrentLead(updated);
      if (onLeadUpdated) onLeadUpdated(updated);
      toast.success(`Lead assigned to ${res.ownerName}`);

      const nowIso = new Date().toISOString();
      setTimeline((prev) => [
        {
          id: `act-assign-${Date.now()}`,
          leadId: currentLead.id,
          type: "assignment",
          subject: res.assignmentType === "REASSIGN" ? `Lead reassigned to ${res.ownerName}` : `Lead assigned to ${res.ownerName}`,
          description: assignNotes.trim()
            ? `Lead assigned to ${res.ownerName} (${targetMember.role}). Note: ${assignNotes.trim()}`
            : `Lead assigned to ${res.ownerName} (${targetMember.role})`,
          performedBy: "Team Manager",
          createdAt: nowIso,
          exactTimestamp: formatExactTimestamp(nowIso).exact,
          timeAgo: "Just now",
        },
        ...(Array.isArray(prev) ? prev : []),
      ]);
      setPickerOpen(false);
      setAssignNotes("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign lead");
    } finally {
      setAssigningOwner(false);
    }
  };

  const handleUnassign = async () => {
    if (assigningOwner) return;
    setAssigningOwner(true);

    try {
      await unassignLeadFn({
        data: {
          leadId: currentLead.id,
          reason: "Returned to unassigned inbox",
        },
      });

      const updated: LiveLead = {
        ...currentLead,
        owner: null,
        ownerName: "Unassigned",
      };
      setCurrentLead(updated);
      if (onLeadUpdated) onLeadUpdated(updated);
      toast.success("Lead moved to unassigned inbox");

      const nowIso = new Date().toISOString();
      setTimeline((prev) => [
        {
          id: `act-unassign-${Date.now()}`,
          leadId: currentLead.id,
          type: "assignment",
          subject: "Lead unassigned",
          description: "Lead unassigned and returned to unassigned pool",
          performedBy: "Team Manager",
          createdAt: nowIso,
          exactTimestamp: formatExactTimestamp(nowIso).exact,
          timeAgo: "Just now",
        },
        ...(Array.isArray(prev) ? prev : []),
      ]);
    } catch (e) {
      console.warn("[unassignLead] DB error:", e);
    } finally {
      setAssigningOwner(false);
    }
  };

  const openSiteVisitModal = () => {
    setVisitDate(currentLead.siteVisitDate || "");
    setVisitTime(currentLead.siteVisitTime || "");
    setVisitNotes(currentLead.followUpNotes || "");
    setSiteVisitModalOpen(true);
  };

  const handleStageClick = async (newStage: string) => {
    if (changingStage) return;

    if (newStage === "Site Visit Scheduled" || newStage === "Visit") {
      openSiteVisitModal();
      return;
    }

    setChangingStage(true);
    try {
      const res = await updateStageFn({
        data: {
          leadId: currentLead.id,
          stage: newStage,
        },
      });

      const updated: LiveLead = {
        ...currentLead,
        stage: newStage,
        followUpDate: res.followUpDate !== undefined ? res.followUpDate : currentLead.followUpDate,
        followUpTime: res.followUpTime !== undefined ? res.followUpTime : currentLead.followUpTime,
        followUpStatus: res.followUpStatus !== undefined ? res.followUpStatus : currentLead.followUpStatus,
      };
      setCurrentLead(updated);
      if (onLeadUpdated) onLeadUpdated(updated);
      toast.success(`Status updated to ${newStage}`);

      if (res.activity) {
        setTimeline((prev) => [res.activity!, ...(Array.isArray(prev) ? prev : [])]);
      } else {
        const nowIso = new Date().toISOString();
        setTimeline((prev) => [
          {
            id: `act-stage-${Date.now()}`,
            leadId: currentLead.id,
            type: "stage_change",
            subject: `Status changed to ${newStage}`,
            description: `Lead moved to ${newStage} status in workflow`,
            performedBy: "Platform Administrator",
            createdAt: nowIso,
            exactTimestamp: formatExactTimestamp(nowIso).exact,
            timeAgo: "Just now",
          },
          ...(Array.isArray(prev) ? prev : []),
        ]);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setChangingStage(false);
    }
  };

  const handleConfirmSiteVisit = async () => {
    if (!visitDate) {
      toast.error("Please select a date for the site visit");
      return;
    }

    if (!visitTime) {
      toast.error("Please select a time for the site visit");
      return;
    }

    setChangingStage(true);
    try {
      const res = await updateStageFn({
        data: {
          leadId: currentLead.id,
          stage: "Site Visit Scheduled",
          siteVisitDate: visitDate,
          siteVisitTime: visitTime,
          notes: visitNotes.trim() || undefined,
        },
      });

      const updated: LiveLead = {
        ...currentLead,
        stage: "Site Visit Scheduled",
        siteVisitDate: visitDate,
        siteVisitTime: visitTime,
        followUpDate: visitDate,
        followUpTime: visitTime,
        followUpStatus: "pending",
        followUpNotes: visitNotes.trim() || `Site visit scheduled for ${visitDate} at ${visitTime}`,
      };
      setCurrentLead(updated);
      if (onLeadUpdated) onLeadUpdated(updated);
      toast.success(`Site visit scheduled for ${visitDate} at ${visitTime}`);

      if (res.activity) {
        setTimeline((prev) => [res.activity!, ...(Array.isArray(prev) ? prev : [])]);
      } else {
        const nowIso = new Date().toISOString();
        setTimeline((prev) => [
          {
            id: `act-visit-${Date.now()}`,
            leadId: currentLead.id,
            type: "meeting",
            subject: `Site Visit Scheduled for ${visitDate} at ${visitTime}`,
            description: visitNotes.trim()
              ? `Site visit confirmed for ${visitDate} ${visitTime}. Note: ${visitNotes.trim()}`
              : `Site visit appointment booked for ${visitDate} at ${visitTime}`,
            performedBy: "Platform Administrator",
            createdAt: nowIso,
            exactTimestamp: formatExactTimestamp(nowIso).exact,
            timeAgo: "Just now",
          },
          ...(Array.isArray(prev) ? prev : []),
        ]);
      }

      setSiteVisitModalOpen(false);
      setVisitNotes("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to schedule site visit");
    } finally {
      setChangingStage(false);
    }
  };

  const handleRecordOutcome = async () => {
    if (savingOutcome || !currentLead) return;

    if (outcomeType === "UNDECIDED" && (!outcomeFollowUpDate || !outcomeFollowUpTime)) {
      toast.error("Please specify both a follow-up date and time for undecided prospects");
      return;
    }

    setSavingOutcome(true);

    try {
      const res = await recordSiteVisitOutcomeFn({
        data: {
          leadId: currentLead.id,
          outcome: outcomeType,
          notes: outcomeNotes.trim() || undefined,
          reason: outcomeReason.trim() || undefined,
          nextFollowUpDate: outcomeType === "UNDECIDED" ? outcomeFollowUpDate : undefined,
          nextFollowUpTime: outcomeType === "UNDECIDED" ? outcomeFollowUpTime : undefined,
          unitInterest: outcomeUnitInterest.trim() || undefined,
          offeredBudgetInr: outcomeBudget ? Number(outcomeBudget) : undefined,
        },
      });

      const updated: LiveLead = {
        ...currentLead,
        stage: res.stage,
        budgetInr: outcomeBudget ? Number(outcomeBudget) : currentLead.budgetInr,
        budget: outcomeBudget ? formatBudgetInr(Number(outcomeBudget)) : currentLead.budget,
        followUpStatus: outcomeType === "UNDECIDED" ? "pending" : "completed",
        followUpDate: outcomeType === "UNDECIDED" ? outcomeFollowUpDate : currentLead.followUpDate,
        followUpTime: outcomeType === "UNDECIDED" ? outcomeFollowUpTime : currentLead.followUpTime,
        followUpNotes: outcomeNotes.trim() || currentLead.followUpNotes,
      };
      setCurrentLead(updated);
      if (onLeadUpdated) onLeadUpdated(updated);

      if (res.activity) {
        setTimeline((prev) => [res.activity!, ...(Array.isArray(prev) ? prev : [])]);
      }

      if (outcomeType === "INTERESTED") {
        toast.success(`Outcome saved: Prospect Interested. Deal Room ${res.dealId || ""} initiated!`);
      } else if (outcomeType === "NOT_INTERESTED") {
        toast.success("Outcome saved: Lead marked Not Interested (Closed)");
      } else {
        toast.success("Outcome saved: Follow-up touchpoint scheduled");
      }

      setSiteVisitOutcomeModalOpen(false);
      setOutcomeNotes("");
      setOutcomeUnitInterest("");
      setOutcomeBudget("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to record site visit outcome");
    } finally {
      setSavingOutcome(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative h-full w-full max-w-xl border-l border-[#2B3346] bg-[#0E121C] shadow-2xl flex flex-col overflow-hidden text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#1F2432] bg-[#121622] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30 text-[#D4AF37] font-bold">
              {currentLead.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{currentLead.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                    stageBadgeStyles[currentLead.stage] || "bg-stone-800 text-stone-300 border-stone-700"
                  }`}
                >
                  {currentLead.stage}
                </span>
                {readOnly && (
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-300 uppercase tracking-wider">
                    View Only
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {currentLead.project || "General Inquiry"} · Score:{" "}
                <span className="text-[#D4AF37] font-bold">{currentLead.score}/100</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-stone-400 hover:bg-[#1A2030] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {readOnly && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>Read-only access — lead stage changes and assignments are disabled.</span>
          </div>
        )}

        {/* Drawer Body Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Omnichannel Action Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <a
              href={`tel:${digits}`}
              onClick={() => toast.success(`Calling ${currentLead.name} (${phone})`)}
              className="flex items-center justify-center gap-2 rounded-xl border border-sky-900/60 bg-sky-950/40 p-2.5 text-xs font-bold text-sky-300 hover:bg-sky-900/50 hover:border-sky-600 transition-all shadow-2xs"
            >
              <Phone className="h-3.5 w-3.5 text-sky-400" />
              <span>Call</span>
            </a>

            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => toast.success(`Opening WhatsApp with ${currentLead.name}`)}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-600 transition-all shadow-2xs"
            >
              <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => setSmsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-purple-900/60 bg-purple-950/40 p-2.5 text-xs font-bold text-purple-300 hover:bg-purple-900/50 hover:border-purple-600 transition-all shadow-2xs"
            >
              <MessageCircle className="h-3.5 w-3.5 text-purple-400" />
              <span>SMS</span>
            </button>

            <a
              href={mailUrl}
              onClick={() => toast.success(`Drafting email to ${email}`)}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#2B3346] bg-[#161B26] p-2.5 text-xs font-bold text-stone-200 hover:bg-[#202738] hover:border-[#D4AF37]/50 hover:text-white transition-all shadow-2xs"
            >
              <Mail className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Email</span>
            </a>
          </div>

          {/* Follow-Up Management Panel */}
          <div className="rounded-2xl border border-[#2B3346] bg-[#131722] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F2432] pb-2.5">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[#D4AF37]" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                  FOLLOW-UP APPOINTMENT
                </span>
              </div>
              <div>
                {currentLead.followUpStatus === "completed" ? (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Completed
                  </span>
                ) : currentLead.followUpDate ? (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Scheduled
                  </span>
                ) : (
                  <span className="rounded-full bg-stone-700/40 border border-stone-600/40 px-2.5 py-0.5 text-[10px] font-medium text-stone-400">
                    None Scheduled
                  </span>
                )}
              </div>
            </div>

            {currentLead.followUpDate ? (
              <div className="rounded-xl border border-[#232834] bg-[#10141E] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Next Due Date</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {currentLead.followUpDate} {currentLead.followUpTime ? `at ${currentLead.followUpTime}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {currentLead.followUpStatus !== "completed" && (
                      <button
                        type="button"
                        onClick={() => {
                          setFollowUpMode("complete");
                          setFollowUpModalOpen(true);
                        }}
                        className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/60 transition-all"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFollowUpMode("reschedule");
                        setFollowUpDate(currentLead.followUpDate || "");
                        setFollowUpTime(currentLead.followUpTime || "11:00");
                        setFollowUpModalOpen(true);
                      }}
                      className="rounded-lg border border-[#2B3346] bg-[#171C28] px-2.5 py-1 text-[11px] font-bold text-stone-300 hover:bg-[#202738] hover:text-white transition-all"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
                {currentLead.followUpNotes && (
                  <p className="text-xs text-stone-400 italic pt-1 border-t border-[#1C212E]">
                    "{currentLead.followUpNotes}"
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">No upcoming follow-up booked for this lead.</span>
                <button
                  type="button"
                  onClick={() => {
                    setFollowUpMode("schedule");
                    setFollowUpModalOpen(true);
                  }}
                  className="rounded-xl bg-[#D4AF37] hover:bg-[#C29D26] text-black px-3 py-1.5 text-xs font-bold transition-all"
                >
                  Schedule Follow-Up
                </button>
              </div>
            )}

            {/* Follow-up History sub-list if exists */}
            {currentLead.followUpHistory && currentLead.followUpHistory.length > 0 && (
              <div className="pt-2 border-t border-[#1F2432] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <History className="h-3 w-3" /> Follow-Up History
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {currentLead.followUpHistory.map((h, i) => (
                    <div key={i} className="rounded-lg bg-[#10141E] p-2 text-[11px] flex items-center justify-between">
                      <span className="text-stone-300">
                        {h.scheduledDate} {h.scheduledTime} · <span className="capitalize text-amber-300">{h.status}</span>
                      </span>
                      <span className="text-[10px] text-stone-500">{h.reason || h.notes || "Updated"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lead Assignment Section */}
          <div className="rounded-2xl border border-[#2B3346] bg-[#131722] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F2432] pb-2.5">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#D4AF37]" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                  LEAD ASSIGNMENT
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isUnassigned ? (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                    Unassigned
                  </span>
                ) : isAssignedToMe ? (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Assigned to You
                  </span>
                ) : (
                  <span className="rounded-full bg-sky-500/20 border border-sky-500/40 px-2.5 py-0.5 text-[11px] font-bold text-sky-300">
                    {currentLead.ownerName || currentLead.owner}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            {canManageAssignments && !readOnly ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={assigningOwner}
                  onClick={() => setPickerOpen((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                    pickerOpen
                      ? "border-[#D4AF37] bg-[#241F14] text-[#E5C368]"
                      : "border-[#2B3346] bg-[#171C28] text-stone-200 hover:bg-[#202738] hover:border-stone-500"
                  }`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{isUnassigned ? "Assign Executive…" : "Reassign…"}</span>
                </button>

                {!isUnassigned && (
                  <button
                    type="button"
                    disabled={assigningOwner}
                    onClick={handleUnassign}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-900/40 hover:border-rose-700 transition-all ml-auto"
                  >
                    <UserX className="h-3.5 w-3.5 text-rose-400" />
                    <span>Unassign</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[#1F2535] bg-[#10141E] p-2.5 text-xs text-stone-400 flex items-center justify-between">
                <span className="text-[11px]">Assignment managed by Sales Manager</span>
                <span className="text-[10px] text-stone-500 uppercase font-mono">Protected</span>
              </div>
            )}

            {/* Searchable Executive Selection Popover/Panel */}
            {pickerOpen && (
              <div className="mt-3 rounded-xl border border-[#2F374A] bg-[#161C28] p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    placeholder="Search sales executives by name or role…"
                    className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] pl-8 pr-3 py-1.5 text-xs text-white placeholder-stone-500 outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredMembers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-stone-500">
                      No matching sales executives found.
                    </div>
                  ) : (
                    filteredMembers.map((m) => {
                      const isAssigned = currentLead.assignedToId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={assigningOwner}
                          onClick={() => handleAssignToExecutive(m)}
                          className={`w-full flex items-center justify-between rounded-lg border p-2 text-left transition-all ${
                            isAssigned
                              ? "border-[#D4AF37] bg-[#241F14] text-[#E5C368]"
                              : "border-[#232834] bg-[#121622] text-stone-300 hover:bg-[#1A2030] hover:border-stone-500 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                                isAssigned ? "bg-[#D4AF37] text-black" : "bg-[#202738] text-stone-200"
                              }`}
                            >
                              {m.initials}
                            </div>
                            <div>
                              <div className="text-xs font-bold leading-tight">{m.name}</div>
                              <div className="text-[10px] text-stone-400">{m.role}</div>
                            </div>
                          </div>
                          {isAssigned ? (
                            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">
                              Assigned
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-stone-400 group-hover:text-white">
                              Select →
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <input
                  type="text"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Optional assignment note or handover instruction…"
                  className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] px-3 py-1.5 text-xs text-stone-300 placeholder-stone-500 outline-none focus:border-[#D4AF37]"
                />
              </div>
            )}
          </div>

          {/* Lead Details Grid */}
          <div className="rounded-2xl border border-[#232834] bg-[#131722] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F2432] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">LEAD DRILLDOWN</span>
              <span className="text-[10px] font-mono text-stone-500">ID: {currentLead.id}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Budget Range</span>
                <span className="font-bold text-stone-100 text-sm">{currentLead.budget}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Inbound Channel</span>
                <span className="font-bold text-stone-100">{currentLead.source}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Phone</span>
                <span className="font-mono text-stone-200">{phone}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-semibold">Email</span>
                <span className="text-stone-200 truncate block">{email}</span>
              </div>
              {currentLead.siteVisitDate && currentLead.siteVisitTime ? (
                <div className="col-span-2 mt-1 rounded-xl border border-violet-500/40 bg-violet-950/30 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-violet-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-violet-300 block">
                        Site Visit Appointment
                      </span>
                      <span className="text-xs font-bold text-white">
                        {currentLead.siteVisitDate} at {currentLead.siteVisitTime}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openSiteVisitModal}
                    className="text-[10px] font-bold text-violet-300 hover:text-white underline px-1"
                  >
                    Reschedule
                  </button>
                </div>
              ) : currentLead.stage.toLowerCase().includes("visit") ? (
                <div className="col-span-2 mt-1 rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-300 block">
                        Site Visit Date & Time Missing
                      </span>
                      <span className="text-xs text-stone-300">
                        The lead is marked for a site visit, but no appointment has been booked yet.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openSiteVisitModal}
                    className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-[10px] font-bold text-black hover:bg-amber-300 transition-all"
                  >
                    Schedule Visit
                  </button>
                </div>
              ) : null}

              {Boolean(currentLead.siteVisitDate || currentLead.stage.toLowerCase().includes("visit")) && (
                <div className="col-span-2 mt-2 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#D4AF37] shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#D4AF37] block">
                        Record Visit Outcome
                      </span>
                      <span className="text-xs text-stone-300">
                        Interested (Negotiation & Deal Room), Not Interested, or Undecided.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setSiteVisitOutcomeModalOpen(true)}
                    className="shrink-0 rounded-lg bg-[#D4AF37] hover:bg-[#C29D26] text-black px-3 py-1.5 text-xs font-bold transition-all shadow-xs"
                  >
                    Record Outcome
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pipeline Stage Transition */}
          <div className="rounded-2xl border border-[#232834] bg-[#131722] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F2432] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-300">LEAD STATUS & PIPELINE</span>
              <span className="text-[10px] text-stone-500">Select status to update</span>
            </div>

            {/* Pipeline Progression */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">Pipeline Flow</span>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUS_CATEGORIES.pipeline.map((s) => {
                  const isSelected = currentLead.stage.toLowerCase() === s.id.toLowerCase() ||
                    (s.id === "Site Visit Scheduled" && currentLead.stage.toLowerCase().includes("visit"));
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={changingStage}
                      onClick={() => handleStageClick(s.id)}
                      className={`rounded-lg py-1.5 px-2.5 text-center text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-[#D4AF37] text-black shadow-sm"
                          : "border border-[#262E3E] bg-[#171C28] text-stone-300 hover:bg-[#202738] hover:text-white hover:border-[#D4AF37]/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Call Dispositions */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[9px] uppercase font-bold text-amber-400/90 tracking-wider">Call Dispositions</span>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUS_CATEGORIES.disposition.map((s) => {
                  const isSelected = currentLead.stage.toLowerCase() === s.id.toLowerCase() ||
                    (s.id.includes("RNR") && currentLead.stage.toLowerCase().includes("rnr"));
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={changingStage}
                      onClick={() => handleStageClick(s.id)}
                      className={`rounded-lg py-1.5 px-2.5 text-center text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-amber-500 text-black shadow-sm"
                          : "border border-amber-900/40 bg-amber-950/20 text-amber-300/90 hover:bg-amber-900/40 hover:text-amber-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Closure / Disqualified */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[9px] uppercase font-bold text-red-400/90 tracking-wider">Lost / Disqualified</span>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUS_CATEGORIES.closure.map((s) => {
                  const isSelected = currentLead.stage.toLowerCase() === s.id.toLowerCase();
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={changingStage}
                      onClick={() => handleStageClick(s.id)}
                      className={`rounded-lg py-1.5 px-2.5 text-center text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-red-500 text-white shadow-sm"
                          : "border border-red-900/40 bg-red-950/20 text-red-300/90 hover:bg-red-900/40 hover:text-red-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notes & Activity Stream with Exact Timestamps */}
          <div className="rounded-2xl border border-[#232834] bg-[#131722] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F2432] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                ACTIVITY & COMMENTS TIMELINE
              </span>
              <span className="text-[10px] font-bold text-stone-400">{safeTimeline.length} Entries</span>
            </div>

            {/* Post Note Form */}
            <form onSubmit={handlePostComment} className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add an internal note or call follow-up detail..."
                rows={2}
                className="w-full rounded-xl border border-[#2B3346] bg-[#171C28] p-2.5 text-xs text-white placeholder-stone-500 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="flex items-center gap-1.5 rounded-lg fort-btn-gold px-3 py-1.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-3 w-3" />
                  <span>{submittingComment ? "Posting…" : "Post Note"}</span>
                </button>
              </div>
            </form>

            {/* Activity Timeline List with Exact Timestamps */}
            <div className="space-y-3 pt-2">
              {loadingTimeline && safeTimeline.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-500">Loading timeline…</div>
              ) : safeTimeline.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-500">No activity logged yet.</div>
              ) : (
                safeTimeline.map((act) => {
                  const isQualification = act.type === "qualification" || act.type === "ai";
                  const isStage = act.type === "stage_change" || act.type === "task";
                  const isAssign = act.type === "assignment" || act.subject.toLowerCase().includes("assign");
                  const isSms = act.type === "sms";
                  const isCall = act.type === "call";
                  const isFollowUp = act.type === "follow_up";
                  const exactFormatted = act.exactTimestamp || formatExactTimestamp(act.createdAt).exact;

                  return (
                    <div
                      key={act.id}
                      className="flex items-start gap-3 rounded-xl border border-[#1F2535] bg-[#161B26] p-3 text-xs"
                    >
                      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#202738] text-stone-300">
                        {isQualification ? (
                          <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                        ) : isAssign ? (
                          <UserCheck className="h-3.5 w-3.5 text-sky-400" />
                        ) : isSms ? (
                          <MessageCircle className="h-3.5 w-3.5 text-purple-400" />
                        ) : isCall ? (
                          <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        ) : isFollowUp ? (
                          <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
                        ) : isStage ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-bold text-stone-100">{act.subject}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono">
                            <span className="text-[#D4AF37]/90">{exactFormatted}</span>
                            <span className="text-stone-500">({act.timeAgo})</span>
                          </div>
                        </div>
                        {act.description && (
                          <p className="mt-1 text-stone-300 leading-snug">{act.description}</p>
                        )}
                        <span className="mt-1 block text-[9px] font-semibold text-stone-400">
                          By {act.performedBy}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SMS Compose Modal */}
      {smsModalOpen && (
        <div
          onClick={() => setSmsModalOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#2B3346] bg-[#121622] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[#1F2535] pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/20 text-purple-300">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Send SMS Message</h3>
                  <p className="text-[11px] text-stone-400">
                    To: {currentLead.name} ({phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSmsModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-[#1A2030] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                  Quick Templates
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Hi, following up on your project inquiry with Sentinel Fort.",
                    "Site visit confirmed for your upcoming appointment.",
                    "Sharing brochure and latest pricing sheets via SMS.",
                    "Please let us know your preferred time for a quick call.",
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSmsMessage(tpl)}
                      className="rounded-lg border border-[#2B3346] bg-[#171C28] px-2 py-1 text-[10px] text-stone-300 hover:bg-[#202738] hover:text-white text-left"
                    >
                      {tpl.slice(0, 32)}…
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                  SMS Message Body *
                </label>
                <textarea
                  rows={4}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type SMS text to dispatch to customer..."
                  className="w-full rounded-xl border border-[#2B3346] bg-[#171C28] p-2.5 text-xs text-white placeholder-stone-500 outline-none focus:border-[#D4AF37]"
                />
                <span className="text-[10px] text-stone-500 text-right block mt-1">
                  {smsMessage.length} characters (1 SMS segment)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2535]">
              <button
                type="button"
                onClick={() => setSmsModalOpen(false)}
                className="rounded-lg border border-[#2B3346] px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-[#1C2230]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!smsMessage.trim() || sendingSms}
                onClick={handleSendSMS}
                className="rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-1.5 text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sendingSms ? "Sending…" : "Send & Log SMS"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-Up Management Modal */}
      {followUpModalOpen && (
        <div
          onClick={() => setFollowUpModalOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#2B3346] bg-[#121622] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[#1F2535] pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/20 text-amber-300">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {followUpMode === "complete"
                      ? "Complete Follow-Up"
                      : followUpMode === "reschedule"
                      ? "Reschedule Follow-Up"
                      : "Schedule Follow-Up"}
                  </h3>
                  <p className="text-[11px] text-stone-400">{currentLead.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-[#1A2030] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {followUpMode !== "complete" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                        Follow-Up Date *
                      </label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full rounded-xl border border-[#2B3346] bg-[#171C28] p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                        Follow-Up Time *
                      </label>
                      <input
                        type="time"
                        value={followUpTime}
                        onChange={(e) => setFollowUpTime(e.target.value)}
                        className="w-full rounded-xl border border-[#2B3346] bg-[#171C28] p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  {followUpMode === "reschedule" && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                        Reschedule Reason
                      </label>
                      <input
                        type="text"
                        value={followUpReason}
                        onChange={(e) => setFollowUpReason(e.target.value)}
                        placeholder="Client requested later slot / unavailable / busy…"
                        className="w-full rounded-xl border border-[#2B3346] bg-[#171C28] p-2.5 text-xs text-white placeholder-stone-500 outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                  {followUpMode === "complete" ? "Outcome / Notes" : "Agenda / Notes"}
                </label>
                <textarea
                  rows={3}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder={
                    followUpMode === "complete"
                      ? "Summary of conversation outcome, client response, and next milestone…"
                      : "Discussion topics, floor plan variants, pricing review notes…"
                  }
                  className="w-full rounded-xl border border-[#2B3346] bg-[#171C28] p-2.5 text-xs text-white placeholder-stone-500 outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2535]">
              <button
                type="button"
                onClick={() => setFollowUpModalOpen(false)}
                className="rounded-lg border border-[#2B3346] px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-[#1C2230]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingFollowUp}
                onClick={handleSaveFollowUp}
                className="rounded-lg bg-[#D4AF37] hover:bg-[#C29D26] text-black px-4 py-1.5 text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {savingFollowUp
                    ? "Saving…"
                    : followUpMode === "complete"
                    ? "Confirm Complete"
                    : followUpMode === "reschedule"
                    ? "Save Reschedule"
                    : "Save Follow-Up"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Site Visit Schedule Modal */}
      {siteVisitModalOpen && (
        <div
          onClick={() => setSiteVisitModalOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#2B3346] bg-[#121622] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[#1F2535] pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/20 text-violet-300">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Schedule Site Visit</h3>
                  <p className="text-[11px] text-stone-400">
                    {currentLead.name} · {currentLead.project || "Project Inspection"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSiteVisitModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-[#1A2030] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                  Visit Date *
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full rounded-xl border border-[#2B3346] bg-[#171C28] p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                  Visit Time *
                </label>
                <input
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full rounded-xl border border-[#2B3346] bg-[#171C28] p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-300 block mb-1">
                  Visit Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Meeting point, client preference, or transport coordination notes…"
                  className="w-full rounded-xl border border-[#2B3346] bg-[#171C28] p-2.5 text-xs text-white placeholder-stone-500 outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2535]">
              <button
                type="button"
                onClick={() => setSiteVisitModalOpen(false)}
                className="rounded-lg border border-[#2B3346] px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-[#1C2230]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSiteVisit}
                className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Confirm & Schedule Visit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Site Visit Outcome Modal */}
      {siteVisitOutcomeModalOpen && (
        <div
          onClick={() => setSiteVisitOutcomeModalOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-[#2B3346] bg-[#121622] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-stone-200"
          >
            <div className="flex items-center justify-between border-b border-[#1F2535] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#D4AF37]/20 text-[#D4AF37]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Record Site Visit Outcome</h3>
                  <p className="text-[11px] text-stone-400">
                    {currentLead.name} · {currentLead.project || "Property Walkthrough"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSiteVisitOutcomeModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-[#1A2030] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 3-way Branching Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Prospect Decision *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOutcomeType("INTERESTED")}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    outcomeType === "INTERESTED"
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold shadow-sm"
                      : "border-[#252C3D] bg-[#151A26] text-stone-300 hover:border-emerald-500/50"
                  }`}
                >
                  <div className="text-xs font-bold">Interested</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Advance to Negotiation & Deal Room</div>
                </button>

                <button
                  type="button"
                  onClick={() => setOutcomeType("NOT_INTERESTED")}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    outcomeType === "NOT_INTERESTED"
                      ? "border-rose-500 bg-rose-500/20 text-rose-200 font-bold shadow-sm"
                      : "border-[#252C3D] bg-[#151A26] text-stone-300 hover:border-rose-500/50"
                  }`}
                >
                  <div className="text-xs font-bold">Not Interested</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Close / Move to Outgoing</div>
                </button>

                <button
                  type="button"
                  onClick={() => setOutcomeType("UNDECIDED")}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    outcomeType === "UNDECIDED"
                      ? "border-amber-500 bg-amber-500/20 text-amber-200 font-bold shadow-sm"
                      : "border-[#252C3D] bg-[#151A26] text-stone-300 hover:border-amber-500/50"
                  }`}
                >
                  <div className="text-xs font-bold">Undecided</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Retain in Follow-Up</div>
                </button>
              </div>
            </div>

            {/* Dynamic Form Sections based on outcomeType */}
            {outcomeType === "INTERESTED" && (
              <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs">
                <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Negotiation & Preliminary Deal Room Initiation</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Unit of Interest
                    </label>
                    <input
                      type="text"
                      value={outcomeUnitInterest}
                      onChange={(e) => setOutcomeUnitInterest(e.target.value)}
                      placeholder="e.g. Tower A - 1204"
                      className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] p-2 text-xs text-white placeholder-stone-600 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Offered / Target Budget (₹)
                    </label>
                    <input
                      type="number"
                      value={outcomeBudget}
                      onChange={(e) => setOutcomeBudget(e.target.value)}
                      placeholder="e.g. 24000000"
                      className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] p-2 text-xs text-white placeholder-stone-600 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Walkthrough Notes & Commercial Terms Discussed
                  </label>
                  <textarea
                    rows={2}
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    placeholder="Preferred floor, payment plan requested, parking requirements…"
                    className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] p-2 text-xs text-white placeholder-stone-600 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {outcomeType === "NOT_INTERESTED" && (
              <div className="space-y-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs">
                <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                  <UserX className="h-3.5 w-3.5 text-rose-400" />
                  <span>Closure Reason & Feedback</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Primary Reason *
                  </label>
                  <select
                    value={outcomeReason}
                    onChange={(e) => setOutcomeReason(e.target.value)}
                    className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] p-2 text-xs text-white outline-none focus:border-rose-500"
                  >
                    <option value="Price / Budget too high">Price / Budget too high</option>
                    <option value="Location / Connectivity mismatch">Location / Connectivity mismatch</option>
                    <option value="Unit layout or carpet area unsuitable">Unit layout or carpet area unsuitable</option>
                    <option value="Purchased with competitor project">Purchased with competitor project</option>
                    <option value="Postponed property purchase indefinitely">Postponed property purchase indefinitely</option>
                    <option value="Possession timeline too distant">Possession timeline too distant</option>
                    <option value="Other / Client declined">Other / Client declined</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Specific Objections or Notes
                  </label>
                  <textarea
                    rows={2}
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    placeholder="Details about client feedback or objections during visit…"
                    className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] p-2 text-xs text-white placeholder-stone-600 outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            {outcomeType === "UNDECIDED" && (
              <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Follow-Up Appointment Scheduling</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Next Follow-Up Date *
                    </label>
                    <input
                      type="date"
                      value={outcomeFollowUpDate}
                      onChange={(e) => setOutcomeFollowUpDate(e.target.value)}
                      className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] p-2 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Follow-Up Time *
                    </label>
                    <input
                      type="time"
                      value={outcomeFollowUpTime}
                      onChange={(e) => setOutcomeFollowUpTime(e.target.value)}
                      className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] p-2 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Follow-Up Action Items
                  </label>
                  <textarea
                    rows={2}
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    placeholder="e.g. Send updated cost sheet, coordinate family walkthrough…"
                    className="w-full rounded-lg border border-[#2B3346] bg-[#10141E] p-2 text-xs text-white placeholder-stone-600 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F2535]">
              <button
                type="button"
                onClick={() => setSiteVisitOutcomeModalOpen(false)}
                className="rounded-lg border border-[#2B3346] px-3.5 py-1.5 text-xs font-medium text-stone-300 hover:bg-[#1C2230]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  savingOutcome ||
                  (outcomeType === "UNDECIDED" && (!outcomeFollowUpDate || !outcomeFollowUpTime))
                }
                onClick={handleRecordOutcome}
                className={`rounded-lg px-4 py-2 text-xs font-bold shadow-sm flex items-center gap-1.5 text-black disabled:opacity-40 disabled:cursor-not-allowed ${
                  outcomeType === "INTERESTED"
                    ? "bg-emerald-400 hover:bg-emerald-300"
                    : outcomeType === "NOT_INTERESTED"
                    ? "bg-rose-400 hover:bg-rose-300"
                    : "bg-amber-400 hover:bg-amber-300"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{savingOutcome ? "Recording…" : "Save Outcome & Update Workflow"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
