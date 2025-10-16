"use client";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Candidate, CandidateZ } from "@/lib/types";

type ScoredRow = {
  id: string;
  email: string;
  name: string;
  scores: Record<string, number>;
  factors: Record<string, Record<string, any>>;
  raw: any;
};

function getTopRoleAndScore(row: ScoredRow): { role: string; score: number } {
  const [role, score] =
    Object.entries(row.scores).sort((a, b) => b[1] - a[1])[0] || ["—", 0];
  return { role, score };
}

// Given a pick (from /select), open the rich modal using the scored row if available
function openPickDetails(
  pick: { email: string; name: string; role: string; scores: Record<string, number>; location?: string },
  scored: ScoredRow[],
  openDetails: (row: ScoredRow) => void
) {
  const existing = scored.find(r => r.email === pick.email);
  if (existing) {
    openDetails(existing);
  } else {
    // Fallback: synthesize a minimal row so the modal still opens
    const row: ScoredRow = {
      id: `${pick.email}-pick`,
      email: pick.email,
      name: pick.name,
      scores: pick.scores || {},
      factors: {}, // not available from pick
      raw: { location: pick.location || "—" },
    };
    openDetails(row);
  }
}


export default function Home() {
  const [raw, setRaw] = useState<Candidate[]>([]);
  const [scored, setScored] = useState<ScoredRow[]>([]);
  const [picks, setPicks] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shortlisted, setShortlisted] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<ScoredRow | null>(null);

  const onFile = async (file: File) => {
    const text = await file.text();
    const json = JSON.parse(text);
    const valid = json.map((j: any) => CandidateZ.parse(j));
    setRaw(valid);
    setFileName(file.name);
    setScored([]); // reset
    setSelectedIds(new Set());
    setShortlisted(false);
    setPicks([]);
  };

  const onScore = async () => {
    const { data } = await api.post("/score", raw);
    setScored(data.map((r: any, i: number) => ({ ...r, id: `${r.email}-${i}` })));
    setSelectedIds(new Set());
    setShortlisted(false);
  };

  const onSelect = async () => {
    const { data } = await api.post("/select", raw);
    setPicks(data.picks);
  };

  // Sort by top role score (precompute top score to avoid inconsistencies)
  const sorted = useMemo(() => {
    const withTop = scored.map((row) => {
      const top = getTopRoleAndScore(row);
      return { row, topScore: Number(top.score) || 0 };
    });
    withTop.sort((a, b) =>
      sortDir === "asc" ? a.topScore - b.topScore : b.topScore - a.topScore
    );
    return withTop.map((t) => t.row);
  }, [scored, sortDir]);

  const toggleSort = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = scored.length > 0 && selectedIds.size === scored.length;
  const someChecked = selectedIds.size > 0 && !allChecked;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === scored.length) return new Set();
      return new Set(scored.map((r) => r.id));
    });
  };

  const onShortlist = () => {
    if (selectedIds.size === 0) return;
    const filtered = scored.filter((r) => selectedIds.has(r.id));
    setScored(filtered);
    setShortlisted(true);
  };

  const onDownloadExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = scored.map((r) => {
      const top = getTopRoleAndScore(r);
      const skills = (r.raw?.skills || []).join(", ");
      const expCount = (r.raw?.work_experiences || []).length;
      const location = r.raw?.location || "";
      const salary = r.raw?.annual_salary_expectation?.["full-time"] || "";
      return {
        Name: r.name,
        Email: r.email,
        Location: location,
        "Top Role": top.role,
        "Top Score": top.score,
        Skills: skills,
        "Experience Count": expCount,
        "Salary Expectation": salary,
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Shortlist");
    XLSX.writeFile(wb, "shortlist.xlsx");
  };

  const openDetails = (row: ScoredRow) => {
    setActiveRow(row);
    setOpen(true);
  };

  const closeDetails = () => {
    setOpen(false);
    setActiveRow(null);
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl pl-125 font-semibold tracking-tight">Hiring Ops</h1>
      </header>

      {/* Upload */}
      <section className="card p-5 space-y-4">
        <h2 className="text-lg font-medium">1) Upload candidates</h2>
        <div className="flex items-center gap-3">
          <input
            id="file"
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={(e) => e.target.files && onFile(e.target.files[0])}
          />
          <label htmlFor="file" className="btn btn-secondary cursor-pointer">
            Choose file
          </label>
          <span className="text-sm text-slate-500">
            {fileName || "No file selected"}
          </span>
        </div>
        <p className="text-sm text-slate-500">{raw.length} candidates loaded</p>
      </section>

      {/* Score */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">2) Score & rank</h2>
          <button
            className="btn btn-primary"
            onClick={onScore}
            disabled={!raw.length}
          >
            Score Candidates
          </button>
        </div>

        {/* Controls row */}
        {scored.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleSelectAll}
                  className="appearance-auto accent-blue-600 w-4 h-4"
                />
                Select all
              </label>
              <button
                className="btn btn-secondary"
                onClick={toggleSort}
                title="Sort by Top Role score"
              >
                Sort Top Role: {sortDir === "asc" ? "Low → High" : "High → Low"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && !shortlisted && (
                <button className="btn btn-primary" onClick={onShortlist}>
                  Shortlist ({selectedIds.size})
                </button>
              )}
              {shortlisted && (
                <button className="btn btn-primary" onClick={onDownloadExcel}>
                  Download details (.xlsx)
                </button>
              )}
            </div>
          </div>
        )}

        {sorted.length > 0 && (
          <div className="overflow-auto max-h-[520px] border border-slate-200 rounded-xl">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    {/* column for checkboxes header already above */}
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>
                    <div className="inline-flex items-center gap-2">
                      Top Role
                      <button
                        className="px-1.5 py-1 rounded border border-slate-200 hover:bg-slate-50 inline-flex items-center justify-center"
                        onClick={toggleSort}
                        title="Toggle sort by Top Role score"
                        aria-label="Toggle sort by Top Role score"
                      >
                        {/* Up/Down arrows */}
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 4L6 8H14L10 4Z" fill={sortDir === "asc" ? "#2563EB" : "#94A3B8"} />
                          <path d="M10 16L14 12H6L10 16Z" fill={sortDir === "desc" ? "#2563EB" : "#94A3B8"} />
                        </svg>
                      </button>
                    </div>
                  </th>
                  <th>Why (factors)</th>
                  <th className="w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, idx) => {
                  const top = getTopRoleAndScore(r);
                  const isChecked = selectedIds.has(r.id);
                  return (
                    <tr key={r.id ?? `${r.email}-${idx}`}>
                      <td className="align-middle">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelected(r.id)}
                          className="appearance-auto accent-blue-600 w-4 h-4"
                        />
                      </td>
                      <td className="font-medium">{r.name}</td>
                      <td>{r.email}</td>
                      <td>
                        <span className="inline-flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {top.role} ({top.score})
                          </span>
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(r.factors[top.role]).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-1 rounded-full border text-xs"
                            >
                              {k}:{String(v)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-secondary"
                          onClick={() => openDetails(r)}
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Auto-slate (unchanged) */}
<section className="card p-5 space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-medium">3) Auto-build a Team of 5</h2>
    <button
      className="btn btn-primary"
      onClick={onSelect}
      disabled={!raw.length}
    >
      Suggest Slate
    </button>
  </div>

  {picks.length > 0 && (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {picks.map((p: any) => {
        const matched = scored.find(r => r.email === p.email);
        const salary =
          matched?.raw?.annual_salary_expectation?.["full-time"] || "—";
        const roleScore = p.scores?.[p.role] ??
          (matched ? matched.scores[p.role] : undefined);

        return (
          <div
            key={p.email}
            className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col"
          >
            {/* Role chip */}
            <div className="mb-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                {p.role}{roleScore !== undefined ? ` • ${roleScore}` : ""}
              </span>
            </div>

            {/* Name + email */}
            <div className="space-y-0.5">
              <div className="text-base font-semibold leading-tight">{p.name}</div>
              <div className="text-sm text-slate-500 truncate">{p.email}</div>
            </div>

            {/* Quick facts */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500">Location</div>
                <div className="text-sm font-medium">{p.location || matched?.raw?.location || "—"}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500">Salary</div>
                <div className="text-sm font-medium">{salary}</div>
              </div>
            </div>

            {/* Skills (first few) */}
            {(matched?.raw?.skills?.length ?? 0) > 0 && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {matched!.raw!.skills.slice(0, 6).map((s: string) => (
                    <span key={s} className="px-2 py-0.5 rounded-full border text-xs">
                      {s}
                    </span>
                  ))}
                  {matched!.raw!.skills.length > 6 && (
                    <span className="text-xs text-slate-500">+{matched!.raw!.skills.length - 6} more</span>
                  )}
                </div>
              </div>
            )}

            {/* View more */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                className="btn btn-secondary w-full"
                onClick={() => openPickDetails(p, scored, openDetails)}
              >
                View more
              </button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>


      {/* Modal / Dialog */}
      {open && activeRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeDetails}
          ></div>

          {/* Card dialog */}
          <div className="relative z-10 w-full max-w-2xl">
            <div className="card p-6 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{activeRow.name}</h3>
                  <p className="text-sm text-slate-500">{activeRow.email}</p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={closeDetails}
                  aria-label="Close"
                >
                  Close
                </button>
              </div>

              {/* Fixed height + scroll content */}
              <div className="mt-4 h-[70vh] overflow-y-auto pr-1">
                {/* Top role chips */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Top Roles</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(activeRow.scores)
                      .sort((a, b) => b[1] - a[1])
                      .map(([role, sc]) => (
                        <span
                          key={role}
                          className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm"
                        >
                          {role}: {sc}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Location / Salary */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500">Location</div>
                    <div className="font-medium">
                      {activeRow.raw?.location || "—"}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500">Salary Expectation</div>
                    <div className="font-medium">
                      {activeRow.raw?.annual_salary_expectation?.["full-time"] || "—"}
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {(activeRow.raw?.skills || []).map((s: string) => (
                      <span key={s} className="px-2 py-1 rounded-full border">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Experience</h4>
                  <div className="space-y-2">
                    {(activeRow.raw?.work_experiences || []).map(
                      (e: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200"
                        >
                          <div className="font-medium">
                            {e.roleName || "Role"}{" "}
                            {e.companyName ? `@ ${e.companyName}` : ""}
                          </div>
                          {e.startDate || e.endDate ? (
                            <div className="text-sm text-slate-500">
                              {e.startDate || "?"} — {e.endDate || "Present"}
                            </div>
                          ) : null}
                          {e.description ? (
                            <p className="text-sm mt-1">{e.description}</p>
                          ) : null}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Education */}
                <div className="mb-2">
                  <h4 className="font-medium mb-2">Education</h4>
                  <div className="space-y-2">
                    {(activeRow.raw?.education?.degrees || []).map(
                      (d: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl border border-slate-200"
                        >
                          <div className="font-medium">
                            {d.degree || "Degree"} {d.field ? `in ${d.field}` : ""}
                          </div>
                          {d.school ? (
                            <div className="text-sm text-slate-500">{d.school}</div>
                          ) : null}
                          {(d.isTop25 || d.isTop50) && (
                            <div className="text-xs mt-1 text-blue-700">
                              {d.isTop25 ? "Top 25" : d.isTop50 ? "Top 50" : ""}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
