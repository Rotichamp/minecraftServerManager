import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Cpu, MemoryStick } from "lucide-react";
import { createServer, errMsg } from "../lib/api";
import { saveServer } from "../lib/storage";
import { cn } from "../lib/utils";
import { PageHeader, Input } from "../components/UI";
import { useToast } from "../components/Toast";
import type { CreateServerPayload } from "../types";

const TYPES = [
  { id: "PAPER", name: "Paper", desc: "Best performance & plugin support" },
  { id: "VANILLA", name: "Vanilla", desc: "The original Mojang experience" },
  { id: "FABRIC", name: "Fabric", desc: "Lightweight, mod-friendly" },
  { id: "FORGE", name: "Forge", desc: "The classic heavy modloader" },
];

const RAM_OPTIONS = [
  { mb: 1024, label: "1 GB" },
  { mb: 2048, label: "2 GB" },
  { mb: 4096, label: "4 GB" },
  { mb: 8192, label: "8 GB" },
];

export default function CreateServer() {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [serverId, setServerId] = useState("");
  const [port, setPort] = useState("25565");
  const [type, setType] = useState("PAPER");
  const [ramMB, setRamMB] = useState(2048);
  const [cpuCores, setCpuCores] = useState(2);
  const [deploying, setDeploying] = useState(false);
  const [done, setDone] = useState(false);

  const idValid = /^[a-z0-9][a-z0-9-]{1,30}$/.test(serverId);
  const portNum = Number(port);
  const portValid = Number.isInteger(portNum) && portNum >= 1024 && portNum <= 65535;
  const stepValid = useMemo(
    () => (step === 0 ? idValid && portValid : true),
    [step, idValid, portValid],
  );

  async function deploy() {
    setDeploying(true);
    try {
      const payload: CreateServerPayload = {
        serverId,
        serverPort: portNum,
        serverType: type,
        memoryMB: ramMB,
        cpuCores,
      };
      const res = await createServer(payload);
      saveServer({
        serverId,
        containerId: res.containerId,
        port: res.port,
        type,
        memoryMB: ramMB,
        cpuCores,
        createdAt: new Date().toISOString(),
      });
      toast("success", `${serverId} is deploying — first boot takes a minute`);
      setDone(true);
    } catch (err) {
      toast("error", errMsg(err));
    } finally {
      setDeploying(false);
    }
  }

  /* ── Success screen ── */
  if (done) {
    return (
      <div className="mx-auto max-w-md animate-fade-up pt-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 ring-1 ring-inset ring-accent/25">
          <CheckCircle2 className="h-7 w-7 text-accent" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold">
          <span className="font-mono text-glow">{serverId}</span> is booting up
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The container is starting. First launch pulls the server image and
          generates the world — give it a minute before connecting.
        </p>
        <p className="mt-5 font-mono text-sm text-accent">
          {window.location.hostname}:{port}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="btn-secondary">
            Dashboard
          </Link>
          <button
            onClick={() => navigate(`/server/${serverId}/console`)}
            className="btn-primary"
          >
            Open console
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="New server"
        subtitle="Four quick decisions and you're in business"
      />

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {["Identity", "Version", "Resources"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold transition-colors duration-200",
                i < step && "bg-accent text-bg",
                i === step && "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40",
                i > step && "bg-surface2 text-muted",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "hidden text-xs font-medium sm:block",
                i === step ? "text-ink" : "text-muted",
              )}
            >
              {label}
            </span>
            {i < 2 && <div className="h-px flex-1 bg-white/[0.08]" />}
          </div>
        ))}
      </div>

      <div key={step} className="card animate-fade-up p-5 sm:p-6">
        {/* ── Step 1: Identity ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="sid" className="mb-1.5 block text-sm font-medium">
                Server ID
              </label>
              <Input
                id="sid"
                autoFocus
                value={serverId}
                onChange={(e) => setServerId(e.target.value.toLowerCase())}
                placeholder="survival-world"
                maxLength={32}
              />
              <p className="mt-1.5 text-xs text-muted">
                Lowercase letters, numbers, dashes. Becomes the container name.
              </p>
              {serverId !== "" && !idValid && (
                <p className="mt-1 text-xs text-danger">
                  Use 2–31 lowercase letters, numbers or dashes.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="sport" className="mb-1.5 block text-sm font-medium">
                Port
              </label>
              <Input
                id="sport"
                inputMode="numeric"
                value={port}
                onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))}
                placeholder="25565"
              />
              <p className="mt-1.5 text-xs text-muted">
                Players connect with this port. One server per port. (1024–65535)
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Version ── */}
        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all duration-150 active:scale-[0.99]",
                  type === t.id
                    ? "border-accent/50 bg-accent/[0.07] shadow-glow"
                    : "border-white/[0.08] bg-surface2 hover:border-white/20",
                )}
              >
                <p className="font-display text-sm font-semibold">{t.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{t.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* ── Step 3: Resources ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="mb-2.5 flex items-center gap-2 text-sm font-medium">
                <MemoryStick className="h-4 w-4 text-accent" /> Memory
              </p>
              <div className="grid grid-cols-4 gap-2">
                {RAM_OPTIONS.map((r) => (
                  <button
                    key={r.mb}
                    onClick={() => setRamMB(r.mb)}
                    className={cn(
                      "rounded-lg border py-2.5 font-mono text-sm transition-all duration-150 active:scale-[0.98]",
                      ramMB === r.mb
                        ? "border-accent/50 bg-accent/[0.07] text-accent"
                        : "border-white/[0.08] bg-surface2 text-muted hover:border-white/20 hover:text-ink",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2.5 flex items-center gap-2 text-sm font-medium">
                <Cpu className="h-4 w-4 text-accent" /> CPU cores
              </p>
              <div className="flex items-center gap-3">
                <button
                  aria-label="Fewer cores"
                  onClick={() => setCpuCores((c) => Math.max(1, c - 1))}
                  className="btn-secondary h-9 w-9 !px-0"
                >
                  −
                </button>
                <span className="min-w-16 text-center font-mono text-lg font-semibold">
                  {cpuCores}
                </span>
                <button
                  aria-label="More cores"
                  onClick={() => setCpuCores((c) => Math.min(16, c + 1))}
                  className="btn-secondary h-9 w-9 !px-0"
                >
                  +
                </button>
              </div>
            </div>

            {/* Review strip */}
            <div className="rounded-lg border border-white/[0.06] bg-surface2/60 p-4 font-mono text-xs leading-relaxed text-muted">
              <span className="text-ink">{serverId || "?"}</span> · {type} ·{" "}
              {(ramMB / 1024).toFixed(ramMB % 1024 ? 1 : 0)}GB RAM · {cpuCores} vCPU ·
              port <span className="text-accent">{port}</span>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || deploying}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!stepValid}
              className="btn-primary"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={deploy}
              disabled={deploying || !idValid || !portValid}
              className="btn-primary min-w-36"
            >
              {deploying ? "Pulling image…" : "Deploy server"}
            </button>
          )}
        </div>
      </div>

      {deploying && (
        <p className="mt-3 animate-fade-up text-center text-xs text-muted">
          First deploy downloads the Docker image (~200MB) — this only happens once.
        </p>
      )}
    </>
  );
}
