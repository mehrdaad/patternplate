import * as Compiler from "@patternplate/compiler";
import * as Config from "@patternplate/validate-config";
import * as Util from "util";
import * as T from "./types";

startCompilerWorker().catch(err => {
  setTimeout(() => {
    throw err;
  });
});

const FAILURE_COUNT = 5;

async function startCompilerWorker() {
  const ARSON = require("arson");
  const yargsParser = require("yargs-parser");

  // TODO: sanitize flags
  const flags = yargsParser(process.argv.slice(2));
  const debug = Util.debuglog("PATTERNPLATE");

  const send = (m: T.QueueMessage) => {
    if (typeof process.send === "function" && process.connected) {
      process.send(ARSON.stringify(m));
    }
  };

  const { cwd, target } = flags;
  const config = ARSON.parse(flags.config);

  const [err, valid] = Config.validate({ target: config, name: `${target}-worker` });

  if (!valid) {
    console.error(err);
    return;
  }

  const compiler = await Compiler.compiler({ config, cwd, target });
  const fs = compiler.outputFileSystem;

  let beat = Date.now();
  let failures = 0;

  setInterval(() => {
    const age = Date.now() - beat;
    if (age >= 2000) {
      failures++;
      debug(
        `worker: ${target} beat is ${age}ms old, failure ${failures}/${FAILURE_COUNT}.`
      );
    } else if (failures !== 0) {
      debug(
        `worker: ${target} beat limit met, reset failure to 0/${FAILURE_COUNT}.`
      );
      failures = 0;
    }
    if (failures >= FAILURE_COUNT) {
      send({
        type: "shutdown",
        target
      });
      process.exit(0);
    }
  }, 1000);

  compiler.hooks.compile.tap("patternpalte", () => {
    send({ type: "start", target, payload: {} });
  });

  compiler.hooks.done.tap("patternplate", stats => {
    if (stats.compilation.errors && stats.compilation.errors.length > 0) {
      stats.compilation.errors.forEach(err => {
        return send({ type: "error", target, payload: err });
      });
      return send({ type: "error", target, payload: stats.compilation.errors });
    }
    send({ type: "done", target, payload: (fs as any).data });
  });

  compiler.hooks.failed.tap("patternplate", err => {
    send({ type: "error", target, payload: err });
  });

  process.on("message", async envelope => {
    const message = ARSON.parse(envelope);

    switch (message.type) {
      case "heartbeat": {
        beat = Date.now();
        return;
      }
      case "start": {
        debug(`worker: start ${target}`);
        return compiler.watch({ ignored: "**/pattern.json" }, () => {});
      }
      case "stop": {
        debug(`worker: stop ${target}`);
        process.exit(0);
      }
    }
  });

  send({ type: "ready" });
}