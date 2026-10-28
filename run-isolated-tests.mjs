// Synthetic disposable Postgres 17 test runner for PUBLIC CI isolation lab.
// Reproduces shared-pg-Pool + --test-isolation=process behavior without product source.
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { freemem } from "node:os";
import {
  mkdirSync,
  writeFileSync,
  readdirSync,
  readFileSync,
  existsSync,
  statfsSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(dirname(fileURLToPath(import.meta.url)));

const disk = statfsSync(".");
if (freemem() < 512 * 1024 ** 2 || disk.bavail * disk.bsize < 2 * 1024 ** 3) {
  throw Error("RESOURCE_RESERVE_NOT_MET");
}

const name = `ci-lab-pg-${randomBytes(4).toString("hex")}`;
const password = randomBytes(24).toString("hex");
const docker = (args) =>
  execFileSync("docker", args, { encoding: "utf8", timeout: 120000, windowsHide: true }).trim();

let started = false;
let exitCode = 1;
const redactSecrets = [password];
mkdirSync("tmp/isolated-tests", { recursive: true });
const log = resolve(`tmp/isolated-tests/${name}.log`);
const sanitizedLog = resolve("tmp/isolated-tests/diagnostics-sanitized.txt");
const DIAG_MAX_BYTES = 48 * 1024;
const DIAG_MAX_LINES = 200;

function sanitizeDiagnostics(text) {
  let out = String(text);
  for (const secret of redactSecrets) {
    if (secret && secret.length >= 8) out = out.split(secret).join("[REDACTED]");
  }
  out = out.replace(/postgres(?:ql)?:\/\/[^\s"'\\]+/gi, "[REDACTED_DB_URL]");
  out = out.replace(/\bBearer\s+[A-Za-z0-9._\-+=/]+/g, "Bearer [REDACTED]");
  out = out.replace(
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
    "[REDACTED_PRIVATE_KEY]",
  );
  out = out.replace(
    /(password|passwd|token|secret|authorization|api[_-]?key|jwt|pgpassword)\s*[:=]\s*\S+/gi,
    "$1=[REDACTED]",
  );
  out = out.replace(/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, (m) => (m.length >= 40 ? "[REDACTED_B64]" : m));
  for (const secret of redactSecrets) {
    if (secret && secret.length >= 8 && out.includes(secret)) {
      throw new Error("SANITIZE_INCOMPLETE");
    }
  }
  return out;
}

function emitFailureDiagnostics() {
  try {
    if (!existsSync(log)) {
      console.error("ISOLATED_TESTS_DIAGNOSTICS: log file missing");
      return;
    }
    const raw = readFileSync(log, "utf8");
    const lines = sanitizeDiagnostics(raw).split(/\r?\n/);
    let body = lines.slice(-DIAG_MAX_LINES).join("\n");
    if (Buffer.byteLength(body, "utf8") > DIAG_MAX_BYTES) {
      while (Buffer.byteLength(body, "utf8") > DIAG_MAX_BYTES) {
        const cut = body.indexOf("\n");
        body = cut === -1 ? body.slice(-DIAG_MAX_BYTES) : body.slice(cut + 1);
      }
    }
    writeFileSync(sanitizedLog, body + "\n", { mode: 0o600 });
    console.error("ISOLATED_TESTS_DIAGNOSTICS_BEGIN");
    console.error(body);
    console.error("ISOLATED_TESTS_DIAGNOSTICS_END");
    console.error(
      JSON.stringify({
        diagnostics: true,
        redacted: true,
        sanitizedArtifact: sanitizedLog,
        maxLines: DIAG_MAX_LINES,
        maxBytes: DIAG_MAX_BYTES,
      }),
    );
  } catch (error) {
    console.error("ISOLATED_TESTS_DIAGNOSTICS: withheld (" + String(error.message).slice(0, 80) + ")");
  }
}

try {
  docker([
    "run", "-d", "--rm", "--pull", "never", "--name", name, "--memory", "512m",
    "--tmpfs", "/var/lib/postgresql/data:rw,size=256m",
    "--publish", "127.0.0.1::5432",
    "--env", "POSTGRES_USER=ci_lab",
    "--env", `POSTGRES_PASSWORD=${password}`,
    "--env", "POSTGRES_DB=ci_lab",
    "postgres:17",
  ]);
  started = true;
  const port = docker(["port", name, "5432/tcp"]).split(":").at(-1);
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      docker(["exec", name, "pg_isready", "-U", "ci_lab", "-d", "ci_lab"]);
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!ready) throw Error("POSTGRES_NOT_READY");

  const env = {
    ...process.env,
    NODE_ENV: "test",
    PGHOST: "127.0.0.1",
    PGPORT: port,
    PGUSER: "ci_lab",
    PGPASSWORD: password,
    PGDATABASE: "ci_lab",
  };

  const files = readdirSync("tests")
    .filter((f) => f.endsWith(".test.ts"))
    .sort()
    .map((f) => `tests/${f}`);

  exitCode = 0;
  // Pin process isolation: shared Pool + after()/pool.end() fails under isolation=none.
  const code = await new Promise((done) => {
    const child = spawn(
      process.execPath,
      [
        resolve("node_modules/tsx/dist/cli.mjs"),
        "--test",
        "--test-concurrency=1",
        "--test-isolation=process",
        ...files,
      ],
      { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    let output = "";
    child.stdout.on("data", (c) => (output += c));
    child.stderr.on("data", (c) => (output += c));
    child.on("error", (error) => {
      output += `\nISOLATED_TEST_SPAWN_ERROR: ${error.message}\n`;
      writeFileSync(log, output, { flag: "a" });
      done(1);
    });
    child.on("close", (code, signal) => {
      if (signal) output += `\nISOLATED_TEST_SIGNAL: ${signal}\n`;
      writeFileSync(log, output, { flag: "a" });
      done(code === 0 ? 0 : (code ?? 1));
    });
  });
  if (code) exitCode = code;
} catch (error) {
  exitCode = exitCode || 1;
  console.error("ISOLATED_TESTS_FAILED: " + String(error.message).slice(0, 200));
  try {
    writeFileSync(log, `ISOLATED_TESTS_FAILED: ${String(error.message)}\n`, { flag: "a" });
  } catch {}
} finally {
  if (started) {
    try {
      docker(["stop", name]);
    } catch {}
  }
  if (exitCode) emitFailureDiagnostics();
  console.log(
    JSON.stringify({
      exitCode,
      log: exitCode ? sanitizedLog : log,
      rawLogRetainedLocally: log,
      isolation: "process",
    }),
  );
  process.exitCode = exitCode;
}
