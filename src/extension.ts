import * as vscode from "vscode";

function getFolder(path: string) {
  if (!path) {
    return path;
  }
  let pos = path.lastIndexOf("/");
  if (pos > -1) {
    return path.substring(0, pos + 1);
  }
  return path;
}

function joinPaths(parent: string, child: string) {
  let result = parent;
  if (!result) {
    result = "/";
  }
  if (!result.endsWith("/")) {
    result += "/";
  }
  if (child.startsWith("/")) {
    child = child.substring(1);
  }
  result += child;
  return result;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("errcode.newErrCode", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        "You must have an active editor to generate an ErrCode"
      );
      return;
    }

    let projectIdentifier = vscode.workspace.name;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (workspaceFolder) {
      projectIdentifier = workspaceFolder.name;
    }

    const errCodePrefix =
      (projectIdentifier ? "{" + projectIdentifier + "}" : "") + "(ErrCode-";

    const fileName = editor.document.fileName;
    const dotPosition = fileName.lastIndexOf(".");
    if (dotPosition === -1) {
      vscode.window.showErrorMessage(
        "You must have an active editor with an extension to generate an ErrCode"
      );
      return;
    }
    const extension = fileName.substring(dotPosition);

    const [gitIgnoreFiles, allFoundFiles] = await Promise.all([
      vscode.workspace.findFiles(".gitignore"),
      vscode.workspace.findFiles("**/*" + extension),
    ]);

    const foldersToBeIgnored: string[] = [];
    await Promise.all(
      gitIgnoreFiles.map(async (ignoreFile) => {
        const doc = await vscode.workspace.openTextDocument(ignoreFile);
        const folder = getFolder(ignoreFile.path);
        for (let line of doc.getText().split(/\r?\n/)) {
          if (line.startsWith("/") || line.endsWith("/")) {
            if (!line.endsWith("/")) {
              line += "/";
            }
            foldersToBeIgnored.push(joinPaths(folder, line));
          }
        }
      })
    );

    const filteredFiles = allFoundFiles.filter((file) => {
      const elementFolder = getFolder(file.path);
      return !foldersToBeIgnored.some((ignored) => elementFolder.startsWith(ignored));
    });

    let maxErrCodeFound = 0;
    await Promise.all(
      filteredFiles.map(async (foundFile) => {
        const doc = await vscode.workspace.openTextDocument(foundFile);
        const text = doc.getText();
        let starting = 0;
        while (true) {
          const found = text.indexOf(errCodePrefix, starting);
          if (found === -1) {
            break;
          }
          const end = text.indexOf(")", found + 9);
          if (end === -1) {
            break;
          }
          const errCodeText = text.substring(found + errCodePrefix.length, end);
          const errCodeVal = parseInt(errCodeText, 10);
          if (!isNaN(errCodeVal) && errCodeVal > maxErrCodeFound) {
            maxErrCodeFound = errCodeVal;
          }
          starting = end + 1;
        }
      })
    );

    const nextCode = (maxErrCodeFound + 1).toString().padStart(6, "0");
    const newErrCode = errCodePrefix + nextCode + ")";
    const position = editor.selection.end;
    await editor.edit((editBuilder) => {
      editBuilder.insert(position, newErrCode);
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
