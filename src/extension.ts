import * as vscode from "vscode";
import path from "path";
import * as os from "os";
import fs from "fs";
import { spawn } from "child_process";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("PyPTO.elkLayout", async (id: string, data: any, command: string) => {
    const platform = os.platform();
    const arch = os.arch();
    let elkServerName = "";

    if (platform === "win32") {
      elkServerName = "elk-server-win.exe";
    }
    else if (platform === "linux") {
      console.log("linux")
      if (arch === "arm64" || arch === "arm") {
        console.log("arm arch")
        elkServerName = "elk-server-linux-arch";
      } else {
        elkServerName = "elk-server-linux";
      }
    }
    else if (platform === "darwin") {
      elkServerName = "elk-server-linux";
    }

    const isUnix = platform === "linux" || platform === "darwin";

    const elkServerPath = path.join(
      context.extensionPath,
      "dist",
      "src",
      "assets",
      "java",
      elkServerName
    );

    if (isUnix) {
      try {
        await fs.promises.access(elkServerPath, fs.constants.X_OK);
      } catch {
        try {
          await fs.promises.chmod(elkServerPath, 0o755);
        } catch (chmodError) {
          const msg = chmodError instanceof Error ? chmodError.message : String(chmodError);
          vscode.commands.executeCommand(command, id, {
            type: "error",
            error: `Failed to set execute permissions on ELK server: ${msg}`,
            data,
          });
          return;
        }
      }
    }

    const elkProcess = spawn(elkServerPath);
    elkProcess.stdin.write(data);
    elkProcess.stdin.end();

    let outputData = "";
    let errMessage = "";

    elkProcess.stdout.on("data", (data) => {
      outputData += data.toString();
    });

    elkProcess.stderr.on("data", (data) => {
      errMessage += data.toString();
    });

    elkProcess.on("error", (err) => {
      errMessage += err.message;
    });

    elkProcess.on("close", async (code) => {
      if (code !== 0) {
        vscode.commands.executeCommand(command, id, {
          type: "error",
          error: `ELK server process failed. ${errMessage}`,
          data,
        });
      } else {
        vscode.commands.executeCommand(command, id, outputData);
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() { }