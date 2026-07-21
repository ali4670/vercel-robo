import { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import { useAuth } from "../hooks/use-auth";
import { supabase } from "../lib/supabase-code";
import { toast } from "sonner";
import {
  Users, Plus, Trash2, Check, X, Loader2, ChevronDown, ChevronRight,
  Link as LinkIcon, Unlink, Settings, Search, UserPlus, UserMinus, Mail, Shield,
} from "lucide-react";
import type { Group, LevelTemplate, GroupLevelAssignment } from "../types/content-library";

interface Student {
  id: string;
  username: string;
  phone_number: string | null;
  avatar_url: string | null;
  group_id: string | null;
  group_ids: string[];
}

interface Moderator {
  id: string;
  username: string;
}

interface GroupWithMod extends Group {
  moderator_id?: string | null;
  moderator?: Moderator | null;
}

export function GroupManager() {
  const { isAr } = useLanguage();
  const { isAdmin } = useAuth();
  const [groups, setGroups] = useState<GroupWithMod[]>([]);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [levelTemplates, setLevelTemplates] = useState<LevelTemplate[]>([]);
  const [assignments, setAssignments] = useState<GroupLevelAssignment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<"levels" | "students">("levels");
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [groupsRes, templatesRes, assignmentsRes, studentsRes, modsRes, sgRes] = await Promise.all([
      supabase.from("groups").select("*, moderator:profiles!groups_moderator_id_fkey(id, username)").order("name"),
      supabase.from("level_templates").select("*").eq("is_active", true).order("level_order"),
      supabase.from("group_level_assignments").select("*"),
      supabase.from("profiles").select("id, username, phone_number, avatar_url, group_id").eq("role", "student").order("username"),
      supabase.from("profiles").select("id, username").in("role", ["moderator", "admin"]).order("username"),
      supabase.from("student_groups").select("student_id, group_id"),
    ]);

    if (groupsRes.data) setGroups(groupsRes.data as any);
    if (templatesRes.data) setLevelTemplates(templatesRes.data);
    if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    if (modsRes.data) setModerators(modsRes.data);

    if (studentsRes.data) {
      const sgData = sgRes.data || [];
      const sgMap = new Map<string, string[]>();
      for (const sg of sgData) {
        const existing = sgMap.get(sg.student_id) || [];
        existing.push(sg.group_id);
        sgMap.set(sg.student_id, existing);
      }
      const enriched = studentsRes.data.map((s) => ({
        ...s,
        group_ids: sgMap.get(s.id) || (s.group_id ? [s.group_id] : []),
      }));
      setAllStudents(enriched);
    }

    if (groupsRes.data && groupsRes.data.length > 0) {
      const counts: Record<string, number> = {};
      for (const g of groupsRes.data) {
        const { count } = await supabase
          .from("student_groups")
          .select("*", { count: "exact", head: true })
          .eq("group_id", g.id);
        counts[g.id] = count || 0;
      }
      setStudentCounts(counts);
    }

    setLoading(false);
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error(isAr ? "اسم المجموعة مطلوب" : "Group name is required");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("groups").insert({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || null,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message.includes("duplicate")
        ? (isAr ? "اسم المجموعة موجود بالفعل" : "Group name already exists")
        : error.message);
    } else {
      toast.success(isAr ? "تم إنشاء المجموعة" : "Group created");
      setNewGroupName("");
      setNewGroupDesc("");
      fetchData();
    }
  };

  const deleteGroup = async (group: Group) => {
    const msg = isAr
      ? `حذف "${group.name}"؟ سيتم فصل جميع الطلاب.`
      : `Delete "${group.name}"? All students will be unlinked.`;
    if (!window.confirm(msg)) return;
    await supabase.from("groups").delete().eq("id", group.id);
    toast.success(isAr ? "تم الحذف" : "Deleted");
    fetchData();
  };

  const toggleLevelAssignment = async (groupId: string, levelId: string, isAssigned: boolean) => {
    if (isAssigned) {
      await supabase.from("group_level_assignments")
        .delete()
        .eq("group_id", groupId)
        .eq("level_template_id", levelId);
    } else {
      await supabase.from("group_level_assignments").insert({
        group_id: groupId,
        level_template_id: levelId,
      });
    }
    fetchData();
  };

  const updateDripOverride = async (assignmentId: string, days: number | null) => {
    await supabase.from("group_level_assignments")
      .update({ drip_override_days: days })
      .eq("id", assignmentId);
    fetchData();
  };

  const assignStudent = async (studentId: string, groupId: string) => {
    const { error } = await supabase.from("student_groups").upsert(
      { student_id: studentId, group_id: groupId },
      { onConflict: "student_id,group_id" }
    );
    if (!error) {
      await supabase.from("profiles").update({ group_id: groupId }).eq("id", studentId);
    }
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isAr ? "تم تعيين الطالب" : "Student assigned");
      fetchData();
    }
  };

  const removeStudent = async (studentId: string, groupId?: string) => {
    if (groupId) {
      await supabase.from("student_groups").delete().eq("student_id", studentId).eq("group_id", groupId);
      const { data: remaining } = await supabase.from("student_groups").select("group_id").eq("student_id", studentId);
      if (!remaining || remaining.length === 0) {
        await supabase.from("profiles").update({ group_id: null }).eq("id", studentId);
      } else {
        await supabase.from("profiles").update({ group_id: remaining[0].group_id }).eq("id", studentId);
      }
    } else {
      await supabase.from("student_groups").delete().eq("student_id", studentId);
      await supabase.from("profiles").update({ group_id: null }).eq("id", studentId);
    }
    toast.success(isAr ? "تم إزالة الطالب" : "Student removed");
    fetchData();
  };

  const assignModerator = async (groupId: string, moderatorId: string | null) => {
    const { error } = await supabase.from("groups").update({ moderator_id: moderatorId || null }).eq("id", groupId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isAr ? "تم تحديث المشرف" : "Moderator updated");
      fetchData();
    }
  };

  const getGroupAssignments = (groupId: string) =>
    assignments.filter((a) => a.group_id === groupId);

  const isLevelAssigned = (groupId: string, levelId: string) =>
    assignments.some((a) => a.group_id === groupId && a.level_template_id === levelId);

  const getAssignment = (groupId: string, levelId: string) =>
    assignments.find((a) => a.group_id === groupId && a.level_template_id === levelId);

  const getGroupStudents = (groupId: string) =>
    allStudents.filter((s) => s.group_ids?.includes(groupId));

  const getUnassignedStudents = () => {
    const searchLower = studentSearch.toLowerCase();
    return allStudents.filter((s) =>
      (!s.group_ids || s.group_ids.length === 0) &&
      (s.username?.toLowerCase().includes(searchLower) ||
        s.phone_number?.includes(studentSearch))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Group */}
      <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {isAr ? "إنشاء مجموعة جديدة" : "Create New Group"}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={isAr ? "اسم المجموعة" : "Group name"}
            className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-[10px] text-foreground"
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
          />
          <input
            type="text"
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
            placeholder={isAr ? "الوصف (اختياري)" : "Description (optional)"}
            className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-[10px] text-foreground"
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
          />
          <button
            onClick={createGroup}
            disabled={creating || !newGroupName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            {isAr ? "إنشاء" : "Create"}
          </button>
        </div>
      </div>

      {/* Groups List */}
      <div className="space-y-2">
        {groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-[10px] font-bold uppercase">{isAr ? "لا توجد مجموعات" : "No groups yet"}</p>
          </div>
        ) : (
          groups.map((group) => {
            const isExpanded = expandedGroupId === group.id;
            const groupAssignments = getGroupAssignments(group.id);
            const groupStudents = getGroupStudents(group.id);
            return (
              <div key={group.id} className="bg-muted/30 border border-border rounded-xl overflow-hidden">
                {/* Group Header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                >
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Users className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black">{group.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[8px] text-muted-foreground">
                        {studentCounts[group.id] || 0} {isAr ? "طالب" : "students"}
                      </span>
                      <span className="text-[8px] text-muted-foreground">
                        {groupAssignments.length} {isAr ? "مستوى" : "levels"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGroup(group); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-border p-3 space-y-3">
                    {/* Moderator Assignment */}
                    <div className="flex items-center gap-2 p-2 bg-muted/30 border border-border rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-[9px] font-black uppercase text-muted-foreground shrink-0">
                        {isAr ? "المشرف" : "MOD"}
                      </span>
                      <select
                        value={(group as any).moderator_id || ""}
                        onChange={(e) => assignModerator(group.id, e.target.value || null)}
                        className="flex-1 bg-muted/50 border border-border rounded-md px-2 py-1 text-[9px] text-foreground"
                      >
                        <option value="">{isAr ? "بدون مشرف" : "No Moderator"}</option>
                        {moderators.map((m) => (
                          <option key={m.id} value={m.id}>{m.username}</option>
                        ))}
                      </select>
                    </div>

                    {/* Section Tabs */}
                    <div className="flex gap-1 bg-muted/30 p-0.5 rounded-lg border border-border">
                      <button
                        onClick={() => setExpandedSection("levels")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${
                          expandedSection === "levels" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <LinkIcon className="w-3 h-3" />
                        {isAr ? "المستويات" : "LEVELS"}
                      </button>
                      <button
                        onClick={() => setExpandedSection("students")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${
                          expandedSection === "students" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <UserPlus className="w-3 h-3" />
                        {isAr ? "الطلاب" : "STUDENTS"}
                      </button>
                    </div>

                    {/* Level Template Assignments */}
                    {expandedSection === "levels" && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                          {isAr ? "المستويات المعينة" : "Assigned Levels"}
                        </p>
                        {levelTemplates.length === 0 ? (
                          <p className="text-[9px] text-muted-foreground italic">
                            {isAr ? "أنشئ مستويات أولاً" : "Create level templates first"}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            {levelTemplates.map((lt) => {
                              const assigned = isLevelAssigned(group.id, lt.id);
                              const assignment = getAssignment(group.id, lt.id);
                              return (
                                <div
                                  key={lt.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                    assigned
                                      ? "bg-primary/5 border-primary/30"
                                      : "bg-muted/30 border-border"
                                  }`}
                                >
                                  <button
                                    onClick={() => toggleLevelAssignment(group.id, lt.id, assigned)}
                                    className={`p-1 rounded-md transition-colors ${
                                      assigned ? "bg-primary text-black" : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {assigned ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold truncate">L{lt.level_order} — {lt.title}</p>
                                  </div>
                                  {assigned && assignment && (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min={0}
                                        max={365}
                                        value={assignment.drip_override_days ?? ""}
                                        onChange={(e) => updateDripOverride(
                                          assignment.id,
                                          e.target.value ? parseInt(e.target.value) : null
                                        )}
                                        placeholder={`${lt.drip_interval_days}`}
                                        className="w-12 bg-muted/50 border border-border rounded px-1.5 py-0.5 text-[8px] text-foreground text-center"
                                        title={isAr ? "عدد أيام البث" : "Drip override days"}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className="text-[7px] text-muted-foreground">
                                        {isAr ? "يوم" : "d"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Student Assignment */}
                    {expandedSection === "students" && (
                      <div className="space-y-3">
                        {/* Current Students */}
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                            {isAr ? "الطلاب في المجموعة" : "STUDENTS IN GROUP"} ({groupStudents.length})
                          </p>
                          {groupStudents.length === 0 ? (
                            <p className="text-[9px] text-muted-foreground italic py-2">
                              {isAr ? "لا يوجد طلاب" : "No students assigned"}
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {groupStudents.map((student) => (
                                <div
                                  key={student.id}
                                  className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg"
                                >
                                  <div className="w-7 h-7 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {student.avatar_url ? (
                                      <img src={student.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-[10px] font-black text-muted-foreground">{student.username?.charAt(0)?.toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold truncate">{student.username}</p>
                                    {student.group_ids && student.group_ids.length > 1 ? (
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {student.group_ids.map((gid) => {
                                          const gName = groups.find((g) => g.id === gid)?.name || gid.slice(0, 6);
                                          return (
                                            <span key={gid} className="text-[7px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                              {gName}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    ) : student.phone_number ? (
                                      <p className="text-[8px] text-muted-foreground truncate">{student.phone_number}</p>
                                    ) : null}
                                  </div>
                                  <button
                                    onClick={() => removeStudent(student.id, group.id)}
                                    className="p-1 rounded-md hover:bg-red-500/10 transition-colors"
                                    title={isAr ? "إزالة من المجموعة" : "Remove from this group"}
                                  >
                                    <UserMinus className="w-3 h-3 text-red-400" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Students */}
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                            {isAr ? "إضافة طلاب" : "ADD STUDENTS"}
                          </p>
                          <div className="relative mb-2">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <input
                              type="text"
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                              placeholder={isAr ? "بحث بالاسم أو رقم..." : "Search name or phone..."}
                              className="w-full bg-muted/50 border border-border rounded-lg py-1.5 pl-7 pr-3 text-[9px] font-bold focus:outline-none focus:border-primary/50 transition-all"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {getUnassignedStudents().length === 0 ? (
                              <p className="text-[9px] text-muted-foreground italic py-2 text-center">
                                {studentSearch
                                  ? (isAr ? "لا نتائج" : "No results")
                                  : (isAr ? "جميع الطلاب في مجموعة" : "All students are in a group")}
                              </p>
                            ) : (
                              getUnassignedStudents().map((student) => (
                                <div
                                  key={student.id}
                                  className="flex items-center gap-2 p-2 bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-all"
                                >
                                  <div className="w-7 h-7 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {student.avatar_url ? (
                                      <img src={student.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-[10px] font-black text-muted-foreground">{student.username?.charAt(0)?.toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold truncate">{student.username}</p>
                                    {student.phone_number && (
                                      <p className="text-[8px] text-muted-foreground truncate">{student.phone_number}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => assignStudent(student.id, group.id)}
                                    className="p-1 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-black transition-colors"
                                    title={isAr ? "إضافة للمجموعة" : "Add to group"}
                                  >
                                    <UserPlus className="w-3 h-3" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-[8px] text-muted-foreground font-bold uppercase">
        <span>{groups.length} {isAr ? "مجموعات" : "groups"}</span>
        <span>{allStudents.filter(s => !s.group_ids || s.group_ids.length === 0).length} {isAr ? "طالب غير معيّن" : "unassigned"}</span>
        <span>{levelTemplates.length} {isAr ? "مستويات" : "templates"}</span>
      </div>
    </div>
  );
}
